"use server";

import { serverEnv } from "@/env/server";
import { getCurrentUser } from "./org";
import { getUserWithOrganization } from "@/lib/auth-utils";
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasksByUserId,
  updateTask,
  updateTaskStatus,
} from "@/lib/db/queries";
import { Client } from "@upstash/qstash";

// Shared helpers and QStash client
const qstash = new Client({ token: serverEnv.QSTASH_TOKEN });

function frequencyToCron(
  frequency: string,
  time: string,
  timezone: string,
  dayOfWeek?: string,
): string {
  const [hours, minutes] = time.split(":").map(Number);

  let cronExpression = "";
  switch (frequency) {
    case "once":
      return "";
    case "daily":
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case "weekly": {
      const day = dayOfWeek || "0";
      cronExpression = `${minutes} ${hours} * * ${day}`;
      break;
    }
    case "monthly":
      cronExpression = `${minutes} ${hours} 1 * *`;
      break;
    case "yearly":
      cronExpression = `${minutes} ${hours} 1 1 *`;
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`;
  }

  return `CRON_TZ=${timezone} ${cronExpression}`;
}

function calculateNextRun(cronSchedule: string, timezone: string): Date {
  try {
    const { CronExpressionParser } = require("cron-parser");

    const actualCronExpression = cronSchedule.startsWith("CRON_TZ=")
      ? cronSchedule.split(" ").slice(1).join(" ")
      : cronSchedule;

    const options = {
      currentDate: new Date(),
      tz: timezone,
    };

    const interval = CronExpressionParser.parse(actualCronExpression, options);
    return interval.next().toDate();
  } catch (error) {
    console.error("Error parsing cron expression:", cronSchedule, error);
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }
}

function calculateOnceNextRun(time: string, timezone: string, date?: string): Date {
  const [hours, minutes] = time.split(":").map(Number);

  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(hours, minutes, 0, 0);

  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
}

async function validateTaskAccess(taskId: string, userId: string) {
  const { activeOrganization } = await getUserWithOrganization();
  const currentOrganizationId = activeOrganization?.id || null;

  const task = await getTaskById({ id: taskId, userId, organizationId: currentOrganizationId });
  if (!task) {
    throw new Error("Task not found or access denied");
  }

  return task;
}

export async function createScheduledTask({
  title,
  prompt,
  frequency,
  time,
  timezone = "UTC",
  date,
}: {
  title: string;
  prompt: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  time: string;
  timezone?: string;
  date?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const { activeOrganization } = await getUserWithOrganization();
    const organizationId = activeOrganization?.id || null;

    const existingTasks = await getTasksByUserId({ userId: user.id, organizationId });
    if (existingTasks.length >= serverEnv.MAX_TASKS_PER_USER) {
      throw new Error(`You have reached the maximum limit of ${serverEnv.MAX_TASKS_PER_USER} tasks`);
    }

    if (frequency === "daily") {
      const activeDailyTasks = existingTasks.filter((task) => task.frequency === "daily" && task.status === "active");
      if (activeDailyTasks.length >= serverEnv.MAX_ACTIVE_DAILY_TASKS) {
        throw new Error(`You have reached the maximum limit of ${serverEnv.MAX_ACTIVE_DAILY_TASKS} active daily tasks`);
      }
    }

    let cronSchedule = "";
    let nextRunAt: Date;
    let actualTime = time;
    let dayOfWeek: string | undefined;

    if (frequency === "weekly" && time.includes(":")) {
      const parts = time.split(":");
      if (parts.length === 3) {
        actualTime = `${parts[0]}:${parts[1]}`;
        dayOfWeek = parts[2];
      }
    }

    if (frequency === "once") {
      nextRunAt = calculateOnceNextRun(actualTime, timezone, date);
    } else {
      cronSchedule = frequencyToCron(frequency, actualTime, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    const task = await createTask({
      userId: user.id,
      organizationId,
      title,
      prompt,
      frequency,
      cronSchedule,
      timezone,
      nextRunAt,
      qstashScheduleId: undefined,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (task.id) {
      try {
        if (frequency === "once") {
          const delay = Math.floor((nextRunAt.getTime() - Date.now()) / 1000);
          const minimumDelay = Math.max(delay, serverEnv.MIN_TASK_DELAY_MINUTES * 60);

          if (delay > 0) {
            await qstash.publish({
              url: serverEnv.SCIRA_TASKS_ENDPOINT || `https://scira.ai/api/tasks`,
              body: JSON.stringify({
                taskId: task.id,
                prompt,
                userId: user.id,
              }),
              headers: {
                "Content-Type": "application/json",
              },
              delay: minimumDelay,
            });
          } else {
            throw new Error("Cannot schedule for a time in the past");
          }
        } else {
          const scheduleResponse = await qstash.schedules.create({
            destination: serverEnv.SCIRA_TASKS_ENDPOINT || `https://scira.ai/api/tasks`,
            method: "POST",
            cron: cronSchedule,
            body: JSON.stringify({
              taskId: task.id,
              prompt,
              userId: user.id,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          await updateTask({
            id: task.id,
            userId: user.id,
            organizationId: activeOrganization?.id || null,
            qstashScheduleId: scheduleResponse.scheduleId,
          });

          task.qstashScheduleId = scheduleResponse.scheduleId;
        }
      } catch (qstashError) {
        console.error("Error creating QStash schedule:", qstashError);
        await deleteTask({ id: task.id, userId: user.id, organizationId: activeOrganization?.id || null });
        throw new Error(
          `Failed to ${frequency === "once" ? "schedule one-time search" : "create recurring schedule"}. Please try again.`,
        );
      }
    }

    return { success: true, task } as const;
  } catch (error) {
    console.error("Error creating scheduled task:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export async function getUserTasks(organizationId?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const { activeOrganization } = await getUserWithOrganization();
    const contextOrganizationId = organizationId !== undefined ? organizationId : activeOrganization?.id || null;

    const tasks = await getTasksByUserId({ userId: user.id, organizationId: contextOrganizationId });

    const updatedTasks = tasks.map((task) => {
      if (task.status === "active" && task.cronSchedule && task.frequency !== "once") {
        try {
          const nextRunAt = calculateNextRun(task.cronSchedule, task.timezone);
          return { ...task, nextRunAt };
        } catch (error) {
          console.error("Error calculating next run for task:", task.id, error);
          return task;
        }
      }
      return task;
    });

    return { success: true, tasks: updatedTasks } as const;
  } catch (error) {
    console.error("Error getting user tasks:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export async function updateTaskStatusAction({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused" | "archived" | "running";
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const task = await validateTaskAccess(id, user.id);

    if (task.qstashScheduleId) {
      try {
        if (status === "paused") {
          await qstash.schedules.pause({ schedule: task.qstashScheduleId });
        } else if (status === "active") {
          await qstash.schedules.resume({ schedule: task.qstashScheduleId });
          if (task.cronSchedule) {
            const nextRunAt = calculateNextRun(task.cronSchedule, task.timezone);
            await updateTask({ id, userId: user.id, organizationId: task.organizationId, nextRunAt });
          }
        } else if (status === "archived") {
          await qstash.schedules.delete(task.qstashScheduleId);
        }
      } catch (qstashError) {
        console.error("Error updating QStash schedule:", qstashError);
      }
    }

    const updatedTask = await updateTaskStatus({ id, userId: user.id, organizationId: task.organizationId, status });
    return { success: true, task: updatedTask } as const;
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export async function updateTaskAction({
  id,
  title,
  prompt,
  frequency,
  time,
  timezone,
  dayOfWeek,
}: {
  id: string;
  title: string;
  prompt: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  time: string;
  timezone: string;
  dayOfWeek?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const task = await validateTaskAccess(id, user.id);

    if (frequency === "daily" && task.frequency !== "daily") {
      const { activeOrganization } = await getUserWithOrganization();
      const organizationId = activeOrganization?.id || null;

      const existingTasks = await getTasksByUserId({ userId: user.id, organizationId });
      const activeDailyTasks = existingTasks.filter(
        (existingTask) => existingTask.frequency === "daily" && existingTask.status === "active" && existingTask.id !== id,
      );
      if (activeDailyTasks.length >= serverEnv.MAX_ACTIVE_DAILY_TASKS) {
        throw new Error(`You have reached the maximum limit of ${serverEnv.MAX_ACTIVE_DAILY_TASKS} active daily tasks`);
      }
    }

    let adjustedTime = time;
    if (frequency === "weekly" && dayOfWeek) {
      adjustedTime = `${time}:${dayOfWeek}`;
    }

    let cronSchedule = "";
    let nextRunAt: Date;

    if (frequency === "once") {
      const [hours, minutes] = time.split(":").map(Number);
      const now = new Date();
      nextRunAt = new Date(now);
      nextRunAt.setHours(hours, minutes, 0, 0);

      if (nextRunAt <= now) {
        nextRunAt.setDate(nextRunAt.getDate() + 1);
      }
    } else {
      cronSchedule = frequencyToCron(frequency, time, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    if (task.qstashScheduleId && frequency !== "once") {
      try {
        await qstash.schedules.delete(task.qstashScheduleId);

        const scheduleResponse = await qstash.schedules.create({
          destination: serverEnv.SCIRA_TASKS_ENDPOINT || `https://scira.ai/api/tasks`,
          method: "POST",
          cron: cronSchedule,
          body: JSON.stringify({
            taskId: id,
            prompt: prompt.trim(),
            userId: user.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const updatedTask = await updateTask({
          id,
          userId: user.id,
          organizationId: task.organizationId,
          title: title.trim(),
          prompt: prompt.trim(),
          frequency,
          cronSchedule,
          timezone,
          nextRunAt,
          qstashScheduleId: scheduleResponse.scheduleId,
        });

        return { success: true, task: updatedTask } as const;
      } catch (qstashError) {
        console.error("Error updating QStash schedule:", qstashError);
        throw new Error("Failed to update schedule. Please try again.");
      }
    } else {
      const updatedTask = await updateTask({
        id,
        userId: user.id,
        organizationId: task.organizationId,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
      });

      return { success: true, task: updatedTask } as const;
    }
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export async function deleteTaskAction({ id }: { id: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const task = await validateTaskAccess(id, user.id);

    if (task.qstashScheduleId) {
      try {
        await qstash.schedules.delete(task.qstashScheduleId);
      } catch (error) {
        console.error("Error deleting QStash schedule:", error);
      }
    }

    const { activeOrganization } = await getUserWithOrganization();
    const deletedTask = await deleteTask({ id, userId: user.id, organizationId: activeOrganization?.id || null });
    return { success: true, task: deletedTask } as const;
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export async function testTaskAction({ id }: { id: string }) {
  try {
    const { getCurrentUser: loadCurrentUser } = await import("./org");
    const user = await loadCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    const task = await validateTaskAccess(id, user.id);

    if (task.status === "archived" || task.status === "running") {
      throw new Error(`Cannot test task with status: ${task.status}`);
    }

    const response = await fetch(serverEnv.SCIRA_TASKS_ENDPOINT || "https://scira.ai/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId: task.id,
        prompt: task.prompt,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger task test: ${response.statusText}`);
    }

    return { success: true, message: "Task test started successfully" } as const;
  } catch (error) {
    console.error("Error testing task:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}



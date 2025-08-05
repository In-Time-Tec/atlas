import { Resend } from 'resend';
import { serverEnv } from '@/env/server';
import SearchCompletedEmail from '@/components/emails/task-completed';

const resend = new Resend(serverEnv.RESEND_API_KEY);

interface SendTaskCompletionEmailParams {
  to: string;
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
}

export async function sendTaskCompletionEmail({
  to,
  chatTitle,
  assistantResponse,
  chatId,
}: SendTaskCompletionEmailParams) {
  try {
    const data = await resend.emails.send({
      from: 'Scira AI <noreply@scira.ai>',
      to: [to],
      subject: `Task Complete: ${chatTitle}`,
      react: SearchCompletedEmail({
        chatTitle,
        assistantResponse,
        chatId,
      }),
    });

    console.log('✅ Task completion email sent successfully:', data.data?.id);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error('❌ Failed to send task completion email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 
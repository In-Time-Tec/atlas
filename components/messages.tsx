import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/components/message';
import { UIMessage } from '@ai-sdk/ui-utils';
import { ReasoningPartView, ReasoningPart } from '@/components/reasoning-part';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown';
import { ChatTextHighlighter } from '@/components/chat-text-highlighter';
import ToolInvocationListView from '@/components/tool-invocation-list-view';
import { deleteTrailingMessages } from '@/app/actions';
import { toast } from 'sonner';
import { Share, ShareIcon, CopyIcon } from '@phosphor-icons/react';
import { EnhancedErrorDisplay } from '@/components/message';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr';

import { HugeiconsIcon } from '@hugeicons/react';
import { RepeatIcon, Copy01Icon, Share03Icon } from '@hugeicons/core-free-icons';

interface PartInfo {
  part: any;
  messageIndex: number;
  partIndex: number;
}

interface MessagesProps {
  messages: any[];
  lastUserMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setMessages: (messages: any[] | ((prevMessages: any[]) => any[])) => void;
  append: (message: any, options?: any) => Promise<string | null | undefined>;
  reload: () => Promise<string | null | undefined>;
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  status: string;
  error: Error | null; // Add error from useChat
  user?: any; // Add user prop
  selectedVisibilityType?: 'public' | 'private'; // Add visibility type
  chatId?: string; // Add chatId prop
  onVisibilityChange?: (visibility: 'public' | 'private') => void; // Add visibility change handler
  initialMessages?: any[]; // Add initial messages prop to detect existing chat
  isOwner?: boolean; // Add ownership prop
  onHighlight?: (text: string) => void; // Add highlight handler
}

const AtlasLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <Image
      src="/atlas.png"
      alt="Atlas"
      className="size-7 invert dark:invert-0"
      width={100}
      height={100}
      unoptimized
      quality={100}
      priority
    />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-foreground dark:text-foreground">Atlas</h2>
  </div>
);

const Messages: React.FC<MessagesProps> = React.memo(
  ({
    messages,
    lastUserMessageIndex,
    setMessages,
    append,
    suggestedQuestions,
    setSuggestedQuestions,
    reload,
    status,
    error,
    user,
    selectedVisibilityType = 'private',
    chatId,
    onVisibilityChange,
    initialMessages,
    isOwner,
    onHighlight,
  }) => {
    const [reasoningVisibilityMap, setReasoningVisibilityMap] = useState<Record<string, boolean>>({});
    const [reasoningFullscreenMap, setReasoningFullscreenMap] = useState<Record<string, boolean>>({});
    const reasoningScrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

    useEffect(() => {
      if (initialMessages && initialMessages.length > 0 && !hasInitialScrolled && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        setHasInitialScrolled(true);
      }
    }, [initialMessages, hasInitialScrolled]);

    const memoizedMessages = useMemo(() => {
      return messages.filter((message) => {
        if (message.role === 'user') return true;

        if (message.role === 'assistant') {
          if (message.parts?.some((part: any) => part.type === 'tool-invocation')) {
            return true;
          }
          if (
            message.parts?.some((part: any) => part.type === 'text') ||
            !message.parts?.some((part: any) => part.type === 'tool-invocation')
          ) {
            return true;
          }
          return false;
        }
        return false;
      });
    }, [messages]);

    const isWaitingForResponse = useMemo(() => {
      const lastMessage = memoizedMessages[memoizedMessages.length - 1];
      return lastMessage?.role === 'user' && (status === 'submitted' || status === 'streaming');
    }, [memoizedMessages, status]);

    const hasActiveToolInvocations = useMemo(() => {
      const lastMessage = memoizedMessages[memoizedMessages.length - 1];
      if (lastMessage?.role === 'assistant') {
        return lastMessage.parts?.some((part: any) => part.type === 'tool-invocation');
      }
      return false;
    }, [memoizedMessages]);

    const isMissingAssistantResponse = useMemo(() => {
      const lastMessage = memoizedMessages[memoizedMessages.length - 1];

      if (lastMessage?.role === 'user' && status === 'ready' && !error) {
        return true;
      }

      if (lastMessage?.role === 'assistant' && status === 'ready' && !error) {
        const parts = lastMessage.parts || [];

        const hasVisibleText = parts.some((part: any) => part.type === 'text' && part.text && part.text.trim() !== '');
        const hasToolInvocations = parts.some((part: any) => part.type === 'tool-invocation');

        const hasLegacyContent = lastMessage.content && lastMessage.content.trim() !== '';

        if (!hasVisibleText && !hasToolInvocations && !hasLegacyContent) {
          return true;
        }
      }

      return false;
    }, [memoizedMessages, status, error]);

    const handleRetry = useCallback(async () => {
      try {
        const lastUserMessage = messages.findLast((m) => m.role === 'user');
        if (!lastUserMessage) return;

        if (user && lastUserMessage.id) {
          await deleteTrailingMessages({
            id: lastUserMessage.id,
          });
        }

        const newMessages = [];
        for (let i = 0; i < messages.length; i++) {
          newMessages.push(messages[i]);
          if (messages[i].id === lastUserMessage.id) {
            break;
          }
        }

        setMessages(newMessages);
        setSuggestedQuestions([]);

        await reload();
      } catch (error) {
        console.error('Error in retry:', error);
      }
    }, [messages, user, setMessages, setSuggestedQuestions, reload]);

    const renderPart = useCallback(
      (
        part: UIMessage['parts'][number],
        messageIndex: number,
        partIndex: number,
        parts: UIMessage['parts'],
        message: UIMessage,
      ): React.ReactNode => {
        if (part.type === 'text') {
          if ((!part.text || part.text.trim() === '') && status === 'streaming' && !hasActiveToolInvocations) {
            return (
              <div
                key={`${messageIndex}-${partIndex}-loading`}
                className="flex flex-col min-h-[calc(100vh-18rem)] !m-0 !p-0"
              >
                <AtlasLogoHeader />
                <div className="flex space-x-2 ml-8 mt-2">
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
              </div>
            );
          }

          if (!part.text || part.text.trim() === '') return null;

          const prevPart = parts[partIndex - 1];
          const nextPart = parts[partIndex + 1];
          if (prevPart?.type === 'step-start' && nextPart?.type === 'tool-invocation') {
            console.log(
              'Text between step-start and tool-invocation:',
              JSON.stringify({
                text: part.text,
                partIndex,
                messageIndex,
              }),
            );

            return null;
          }
        }

        switch (part.type) {
          case 'text':
            return (
              <div key={`${messageIndex}-${partIndex}-text`}>
                <div>
                  <ChatTextHighlighter onHighlight={onHighlight} removeHighlightOnClick={true}>
                    <MarkdownRenderer content={part.text} />
                  </ChatTextHighlighter>
                </div>

                {/* Add compact buttons below the text with tooltips */}
                {status === 'ready' && (
                  <div className="flex items-center gap-1 mt-2.5 mb-5 !-ml-1">
                    {/* Only show reload for owners OR unauthenticated users on private chats */}
                    {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  const lastUserMessage = messages.findLast((m) => m.role === 'user');
                                  if (!lastUserMessage) return;

                                  // Step 1: Delete trailing messages if user is authenticated
                                  if (user && lastUserMessage.id) {
                                    await deleteTrailingMessages({
                                      id: lastUserMessage.id,
                                    });
                                  }

                                  // Step 2: Update local state to remove assistant messages
                                  const newMessages = [];
                                  // Find the index of the last user message
                                  for (let i = 0; i < messages.length; i++) {
                                    newMessages.push(messages[i]);
                                    if (messages[i].id === lastUserMessage.id) {
                                      break;
                                    }
                                  }

                                  // Step 3: Update UI state
                                  setMessages(newMessages);
                                  setSuggestedQuestions([]);

                                  // Step 4: Reload
                                  await reload();
                                } catch (error) {
                                  console.error('Error in reload:', error);
                                }
                              }}
                              className="size-8 p-0 rounded-full"
                            >
                              <HugeiconsIcon icon={RepeatIcon} size={32} color="currentColor" strokeWidth={2} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rewrite</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {user && isOwner && selectedVisibilityType === 'private' && chatId && onVisibilityChange && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  await onVisibilityChange('public');
                                  const url = `${window.location.origin}/search/${chatId}`;
                                  await navigator.clipboard.writeText(url);
                                  toast.success('Link copied to clipboard');
                                } catch (error) {
                                  console.error('Error sharing chat:', error);
                                  toast.error('Failed to share chat');
                                }
                              }}
                              className="size-8 p-0 rounded-full"
                            >
                              <HugeiconsIcon icon={Share03Icon} size={32} color="currentColor" strokeWidth={2} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(part.text);
                              toast.success('Copied to clipboard');
                            }}
                            className="size-8 p-0 rounded-full"
                          >
                            <HugeiconsIcon icon={Copy01Icon} size={32} color="currentColor" strokeWidth={2} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            );
          case 'reasoning': {
            const sectionKey = `${messageIndex}-${partIndex}`;
            const hasParallelToolInvocation = parts.some(
              (p: UIMessage['parts'][number]) => p.type === 'tool-invocation',
            );
            const isComplete = parts.some(
              (p: UIMessage['parts'][number], i: number) =>
                i > partIndex && (p.type === 'text' || p.type === 'tool-invocation'),
            );
            const parallelTool = hasParallelToolInvocation
              ? parts.find((p: UIMessage['parts'][number]) => p.type === 'tool-invocation')?.toolInvocation?.toolName ??
                null
              : null;

            const isExpanded = reasoningVisibilityMap[sectionKey] ?? !isComplete;
            const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

            const setIsExpanded = (v: boolean) => setReasoningVisibilityMap((prev) => ({ ...prev, [sectionKey]: v }));
            const setIsFullscreen = (v: boolean) => setReasoningFullscreenMap((prev) => ({ ...prev, [sectionKey]: v }));

            return (
              <ReasoningPartView
                key={sectionKey}
                part={part as ReasoningPart}
                sectionKey={sectionKey}
                isComplete={isComplete}
                duration={null}
                parallelTool={parallelTool}
                isExpanded={isExpanded}
                isFullscreen={isFullscreen}
                setIsExpanded={setIsExpanded}
                setIsFullscreen={setIsFullscreen}
              />
            );
          }
          case 'step-start': {
            const firstStepStartIndex = parts.findIndex((p) => p.type === 'step-start');
            if (partIndex === firstStepStartIndex) {
              return (
                <div key={`${messageIndex}-${partIndex}-step-start-logo`}>
                  <AtlasLogoHeader />
                </div>
              );
            }
            return <div key={`${messageIndex}-${partIndex}-step-start`}></div>;
          }
          case 'tool-invocation':
            return (
              <ToolInvocationListView
                key={`${messageIndex}-${partIndex}-tool`}
                toolInvocations={[part.toolInvocation]}
                annotations={message.annotations}
              />
            );
          default:
            return null;
        }
      },
      [
        status,
        hasActiveToolInvocations,
        messages,
        user,
        isOwner,
        selectedVisibilityType,
        chatId,
        onVisibilityChange,
        setMessages,
        setSuggestedQuestions,
        reload,
        reasoningVisibilityMap,
        reasoningFullscreenMap,
        onHighlight,
      ],
    );

    useEffect(() => {
      if (messagesEndRef.current) {
        if (status === 'streaming' || status === 'submitted') {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        } else if (hasInitialScrolled && memoizedMessages.length > 0) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, [memoizedMessages.length, status, hasInitialScrolled]);

    useEffect(() => {
      const activeReasoning = messages.flatMap((message, messageIndex) =>
        (message.parts || [])
          .map((part: any, partIndex: number) => ({ part, messageIndex, partIndex }))
          .filter(({ part }: PartInfo) => part.type === 'reasoning')
          .filter(({ messageIndex, partIndex }: PartInfo) => {
            const message = messages[messageIndex];
            return !(message.parts || []).some(
              (p: any, i: number) => i > partIndex && (p.type === 'text' || p.type === 'tool-invocation'),
            );
          }),
      );

      if (activeReasoning.length > 0 && reasoningScrollRef.current) {
        reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
      }
    }, [messages]);

    if (memoizedMessages.length === 0) {
      return null;
    }

    return (
      <div className="space-y-0 mb-32 flex flex-col">
        <div className="flex-grow">
          {memoizedMessages.map((message, index) => {
            const isNextMessageAssistant =
              index < memoizedMessages.length - 1 && memoizedMessages[index + 1].role === 'assistant';
            const isCurrentMessageUser = message.role === 'user';
            const isCurrentMessageAssistant = message.role === 'assistant';
            const isLastMessage = index === memoizedMessages.length - 1;

            let messageClasses = '';

            if (isCurrentMessageUser && isNextMessageAssistant) {
              messageClasses = 'mb-0';
            } else if (isCurrentMessageAssistant && index < memoizedMessages.length - 1) {
              messageClasses = 'mb-6 pb-6 border-b border-border dark:border-border';
            } else if (isCurrentMessageAssistant && index === memoizedMessages.length - 1) {
              messageClasses = 'mb-0';
            } else {
              messageClasses = 'mb-0';
            }

            return (
              <div key={message.id || index} className={messageClasses}>
                <Message
                  message={message}
                  index={index}
                  lastUserMessageIndex={lastUserMessageIndex}
                  renderPart={renderPart}
                  status={status}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                  setSuggestedQuestions={setSuggestedQuestions}
                  suggestedQuestions={index === memoizedMessages.length - 1 ? suggestedQuestions : []}
                  user={user}
                  selectedVisibilityType={selectedVisibilityType}
                  reload={reload}
                  isLastMessage={isLastMessage}
                  error={error}
                  isMissingAssistantResponse={isMissingAssistantResponse}
                  handleRetry={handleRetry}
                  isOwner={isOwner}
                  onHighlight={onHighlight}
                />
              </div>
            );
          })}
        </div>

        {status === 'submitted' && !hasActiveToolInvocations && (
          <div className="flex items-start min-h-[calc(100vh-18rem)] !m-0 !p-0">
            <div className="w-full !m-0 !p-0">
              <AtlasLogoHeader />
              <div className="flex space-x-2 ml-8 mt-2">
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {isMissingAssistantResponse && (
          <div className="flex items-start min-h-[calc(100vh-18rem)]">
            <div className="w-full">
              <AtlasLogoHeader />

              <div className="bg-secondary/30 dark:bg-secondary/20 border border-secondary dark:border-secondary rounded-lg p-4 mb-4 max-w-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-secondary-foreground dark:text-secondary-foreground mb-1">
                      No response generated
                    </h3>
                    <p className="text-sm text-secondary-foreground/80 dark:text-secondary-foreground/80">
                      It looks like the assistant didn&apos;t provide a response to your message.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                  {!user && selectedVisibilityType === 'public'
                    ? 'Please sign in to retry or try a different prompt'
                    : 'Try regenerating the response or rephrase your question'}
                </p>
                {(user || selectedVisibilityType === 'private') && (
                  <Button
                    onClick={handleRetry}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Generate Response
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {error && memoizedMessages[memoizedMessages.length - 1]?.role !== 'assistant' && (
          <EnhancedErrorDisplay
            error={error}
            user={user}
            selectedVisibilityType={selectedVisibilityType}
            handleRetry={handleRetry}
          />
        )}

        <div ref={messagesEndRef} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.messages === nextProps.messages &&
      prevProps.status === nextProps.status &&
      prevProps.suggestedQuestions === nextProps.suggestedQuestions &&
      prevProps.error === nextProps.error &&
      prevProps.user?.id === nextProps.user?.id &&
      prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
    );
  },
);

Messages.displayName = 'Messages';

export default Messages;
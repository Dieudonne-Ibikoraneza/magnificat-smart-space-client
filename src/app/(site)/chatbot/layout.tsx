const ChatbotLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="-mx-4 -my-2 flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col overflow-hidden sm:-mx-6 sm:-mt-8 md:h-[calc(100dvh-5rem)] lg:-mx-8">
    {children}
  </div>
);

export default ChatbotLayout;

import { ConversationView } from "@/components/conversation/ConversationView";

export default async function ConversationPage({ params }) {
  const { id } = await params;
  return <ConversationView conversationId={id} />;
}

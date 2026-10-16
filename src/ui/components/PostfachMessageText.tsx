/** WIREFRAME: design.md §4.2 — Postfach emoji exception (archive + mail feed). */
import { splitInboxEmojiPrefix } from "../../inbox/postfach-emoji.ts";

export function PostfachMessageText({
  text,
  className = "postfach-inbox-message",
}: {
  text: string;
  className?: string;
}) {
  const { emoji, body } = splitInboxEmojiPrefix(text);
  if (!emoji) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span className={className}>
      <span className="postfach-inbox-emoji" aria-hidden="true">
        {emoji}
      </span>{" "}
      <span className="postfach-inbox-message-body">{body}</span>
    </span>
  );
}

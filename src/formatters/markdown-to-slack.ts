/**
 * Convert standard Markdown to Slack's mrkdwn format
 */
export function markdownToSlack(markdown: string): string {
  let result = markdown;

  // Use unique placeholders that won't conflict with markdown patterns
  const PLACEHOLDER_PREFIX = '\u0000PLACEHOLDER\u0000';

  // Preserve code blocks by temporarily replacing them
  const codeBlocks: string[] = [];
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `${PLACEHOLDER_PREFIX}CODE_BLOCK_${codeBlocks.length - 1}${PLACEHOLDER_PREFIX}`;
  });

  // Preserve inline code
  const inlineCode: string[] = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    inlineCode.push(match);
    return `${PLACEHOLDER_PREFIX}INLINE_CODE_${inlineCode.length - 1}${PLACEHOLDER_PREFIX}`;
  });

  // Convert links: [text](url) → <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // Convert bold: **text** or __text__ → *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  result = result.replace(/__([^_]+)__/g, '*$1*');

  // Convert italic: *text* (single) or _text_ → _text_
  // Be careful not to convert already-converted bold
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_');

  // Convert headers to bold text
  result = result.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

  // Convert strikethrough: ~~text~~ → ~text~
  result = result.replace(/~~([^~]+)~~/g, '~$1~');

  // Restore inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`${PLACEHOLDER_PREFIX}INLINE_CODE_${i}${PLACEHOLDER_PREFIX}`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    result = result.replace(`${PLACEHOLDER_PREFIX}CODE_BLOCK_${i}${PLACEHOLDER_PREFIX}`, block);
  });

  return result;
}

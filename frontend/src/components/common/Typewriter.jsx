import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

export default function Typewriter({ content, speed = 5, onComplete }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < content.length) {
      // Faster typing for longer strings to avoid waiting too long
      const adjustedSpeed = content.length > 500 ? speed / 2 : speed;
      const timeout = setTimeout(() => {
        setDisplayedContent(content.slice(0, index + 1));
        setIndex(index + 1);
      }, adjustedSpeed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, content, speed, onComplete]);

  return (
    <ReactMarkdown 
      rehypePlugins={[rehypeSanitize]}
      components={{
        p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
        code: ({children}) => <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded font-mono text-sm">{children}</code>
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  );
}

"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-white/90">
      <ReactMarkdown
        components={{
          p: (props) => <p {...props} />,
          ol: (props) => (
            <ol className="list-decimal space-y-1.5 pl-5 marker:text-white/40" {...props} />
          ),
          ul: (props) => (
            <ul className="list-disc space-y-1.5 pl-5 marker:text-white/40" {...props} />
          ),
          li: (props) => <li className="pl-0.5" {...props} />,
          strong: (props) => <strong className="font-semibold text-white" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          a: (props) => <a className="text-emerald-300 underline underline-offset-2" {...props} />,
          h1: (props) => <p className="font-semibold text-white" {...props} />,
          h2: (props) => <p className="font-semibold text-white" {...props} />,
          h3: (props) => <p className="font-semibold text-white" {...props} />,
          code: (props) => <code className="rounded bg-white/10 px-1 py-0.5 text-[13px]" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

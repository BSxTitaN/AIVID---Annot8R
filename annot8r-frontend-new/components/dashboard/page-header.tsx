import { ReactNode } from "react";

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  children?: ReactNode;
}

export function PageHeader({ heading, subheading, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        {subheading && <p className="text-muted-foreground">{subheading}</p>}
      </div>
      {children}
    </div>
  );
}

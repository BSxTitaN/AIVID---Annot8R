// app/(dashboard)/components/project-header.tsx
'use client';

interface ProjectHeaderProps {
  count: number;
}

export function ProjectHeader({ count }: ProjectHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">All Assigned Projects</h1>
      <p className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-2xl bg-[#F4F4F4]">
        {count} {count === 1 ? "Project" : "Projects"}
      </p>
    </div>
  );
}
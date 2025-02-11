// app/(dashboard)/projects/[projectId]/page.tsx
import { getCurrentUser } from "@/lib/apis/auth"
import { redirect } from "next/navigation"
import ProjectDetailImages from "../../components/project-details/project-detail-images"

export default async function ProjectPage() {
  const user = await getCurrentUser()

  if (!user?.username) {
    redirect("/login")
  }

  return (
    <div className="w-full min-h-screen bg-white pgnCtn">
      <ProjectDetailImages userId={user.username} />
    </div>
  )
}
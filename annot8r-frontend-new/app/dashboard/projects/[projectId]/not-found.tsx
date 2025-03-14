import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Not Found - Annotation Platform",
  description: "The requested project could not be found",
};

export default function ProjectNotFound() {
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-56px)]">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-3">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Project Not Found
          </CardTitle>
          <CardDescription className="text-center">
            The project you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to access it.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            This might happen if the project was deleted, or if you followed a
            broken link.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Trophy, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectCompletionNoticeProps {
  projectName: string;
  message?: string;
}

export function ProjectCompletionNotice({
  projectName,
  message = "This project has been marked as complete. No further annotations are required.",
}: ProjectCompletionNoticeProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const router = useRouter();

  const returnToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <>
      {/* Dialog shown initially */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <AlertDialogTitle className="text-xl">Project Completed!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              {projectName} has been marked as complete. Thank you for your contributions to this project!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button className="w-full sm:w-auto" onClick={returnToDashboard}>
              Return to Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsDialogOpen(false)}
            >
              View Project Details
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* The card that remains visible after dialog is closed */}
      <Card className="mb-8 border-green-200 dark:border-green-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Project Completed</CardTitle>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Completed
            </Badge>
          </div>
          <CardDescription>
            This project has been marked as complete by the project admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={returnToDashboard}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
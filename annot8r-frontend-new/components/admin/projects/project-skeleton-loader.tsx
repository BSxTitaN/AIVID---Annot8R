import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export function ProjectSkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-2 rounded-full" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="mt-2 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full" />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <div className="flex items-center">
              <Skeleton className="h-3.5 w-3.5 rounded-full mr-1" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

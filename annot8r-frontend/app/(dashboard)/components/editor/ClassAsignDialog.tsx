import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (className: string) => void;
  availableClasses: string[];
}

const ClassAssignmentDialog: React.FC<ClassAssignmentDialogProps> = ({
  isOpen,
  onClose,
  onAssign,
  availableClasses,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white/95 backdrop-blur-lg border-0 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Assign Class</AlertDialogTitle>
          <AlertDialogDescription>
            Choose a class for this annotation
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Select onValueChange={onAssign}>
          <SelectTrigger className="w-full border border-gray-200 h-10">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {availableClasses.map((className) => (
              <SelectItem
                key={className}
                value={className}
                className="cursor-pointer hover:bg-gray-100"
              >
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-full px-4 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full px-4 bg-blue-500 hover:bg-blue-600"
            onClick={() => onAssign}
          >
            Assign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ClassAssignmentDialog;

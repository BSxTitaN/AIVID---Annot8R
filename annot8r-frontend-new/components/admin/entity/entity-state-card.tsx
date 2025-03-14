// components/entity/EntityStatCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, UserCheck, UserX, Shield, Users } from "lucide-react";

interface EntityStatCardsProps {
  entityType: "users" | "admins";
  totalEntities: number;
  activeEntities: number;
  inactiveEntities: number;
  officeEntities: number;
}

export function EntityStatCards({
  entityType,
  totalEntities,
  activeEntities,
  inactiveEntities,
  officeEntities,
}: EntityStatCardsProps) {
  const isAdmins = entityType === "admins";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total {isAdmins ? "Admins" : "Users"}
          </CardTitle>
          {isAdmins ? (
            <UserCog className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Users className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEntities}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total {isAdmins ? "administrator accounts" : "registered accounts"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active {isAdmins ? "Admins" : "Users"}
          </CardTitle>
          <UserCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeEntities}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalEntities > 0
                ? `${Math.round(
                    (activeEntities / totalEntities) * 100
                  )}% of total ${isAdmins ? "admins" : "users"}`
                : `No ${isAdmins ? "admins" : "users"} yet`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Inactive {isAdmins ? "Admins" : "Users"}
          </CardTitle>
          <UserX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactiveEntities}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalEntities > 0
                ? `${Math.round(
                    (inactiveEntities / totalEntities) * 100
                  )}% of total ${isAdmins ? "admins" : "users"}`
                : `No ${isAdmins ? "admins" : "users"} yet`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isAdmins ? "Super Admins" : "Office Users"}
          </CardTitle>
          {isAdmins ? (
            <Shield className="h-4 w-4 text-blue-500" />
          ) : (
            <UserCog className="h-4 w-4 text-blue-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{officeEntities}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalEntities > 0
                ? `${Math.round(
                    (officeEntities / totalEntities) * 100
                  )}% of total ${isAdmins ? "admins" : "users"}`
                : `No ${isAdmins ? "admins" : "users"} yet`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

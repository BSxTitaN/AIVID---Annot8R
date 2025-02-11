import { DeviceInfoType } from "@/lib/types/users";

interface DeviceInfoProps {
    device?: DeviceInfoType;
  }
  
  export function DeviceInfo({ device }: DeviceInfoProps) {
    if (!device) {
      return (
        <span className="text-muted-foreground text-sm">
          No active session
        </span>
      );
    }
  
    return (
      <div className="text-sm">
        <p>IP: {device.ip}</p>
        <p className="text-muted-foreground text-xs">
          Last seen: {new Date(device.lastSeen).toLocaleString()}
        </p>
      </div>
    );
  }
  
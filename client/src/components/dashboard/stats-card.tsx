import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { useLocation } from "wouter";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue?: number;
  changeText?: string;
  changeDirection?: "up" | "down" | null;
  linkTo?: string; // Navigation path
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  changeValue,
  changeText,
  changeDirection,
  linkTo,
}: StatsCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (linkTo) {
      setLocation(linkTo);
    }
  };

  return (
    <Card 
      className={`p-5 bg-gradient-to-br from-primary/8 via-background/80 to-primary/12 backdrop-blur-sm border-2 border-primary/25 hover:border-primary/45 hover:bg-gradient-to-br hover:from-primary/12 hover:via-background/70 hover:to-primary/18 ${linkTo ? 'cursor-pointer hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:scale-[1.02]' : 'hover:shadow-md hover:shadow-primary/10 transition-all duration-300'}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-primary/70 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-full ${iconBgColor} flex items-center justify-center ${iconColor} shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110`}>
          {icon}
        </div>
      </div>
      
      {(changeValue !== undefined || changeText) && (
        <div className="mt-4 flex items-center text-xs">
          {changeDirection && (
            <span className={changeDirection === "up" ? "text-emerald-500 flex items-center font-semibold" : "text-rose-500 flex items-center font-semibold"}>
              {changeDirection === "up" ? (
                <ArrowUpIcon className="mr-1 h-3 w-3" />
              ) : (
                <ArrowDownIcon className="mr-1 h-3 w-3" />
              )}
              {changeValue !== undefined && `${changeValue}%`}
            </span>
          )}
          {changeText && <span className="text-primary/60 ml-2 font-medium">{changeText}</span>}
        </div>
      )}
    </Card>
  );
}

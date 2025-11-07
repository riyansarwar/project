import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  HelpCircle,
  FileText,
  Users,
  LineChart,
  UserCog,
  Menu,
  GraduationCap,
  School,
  BookOpen,
  BookMarked,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("/dashboard");
  const { user } = useAuth();
  
  useEffect(() => {
    // Set the active tab based on the location
    setActiveTab(location);
  }, [location]);

  // Close sidebar on mobile after navigation
  const handleNavigation = () => {
    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  return (
    <aside 
      className={cn(
        "w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30 transform md:translate-x-0 transition-transform duration-300 ease-in-out pt-16",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="h-full overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          <li className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Main</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                activeTab === "/dashboard" && "bg-primary-50 text-primary-600"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/dashboard");
              }}
            >
              <LayoutDashboard className="mr-3 text-lg text-gray-500" />
              <span>Dashboard</span>
            </div>
          </li>
          
          {isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                  activeTab === "/question-bank" && "bg-primary-50 text-primary-600"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/question-bank");
                }}
              >
                <HelpCircle className="mr-3 text-lg text-gray-500" />
                <span>Question Bank</span>
              </div>
            </li>
          )}
          
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                activeTab === "/quizzes" && "bg-primary-50 text-primary-600"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/quizzes");
              }}
            >
              <FileText className="mr-3 text-lg text-gray-500" />
              <span>Quizzes</span>
            </div>
          </li>
          
          {!isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                  activeTab === "/practice-quiz" && "bg-primary-50 text-primary-600"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/practice-quiz");
                }}
              >
                <BookOpen className="mr-3 text-lg text-gray-500" />
                <span>Practice Quiz</span>
              </div>
            </li>
          )}
          
          {isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                  activeTab === "/students" && "bg-primary-50 text-primary-600"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/students");
                }}
              >
                <Users className="mr-3 text-lg text-gray-500" />
                <span>Students</span>
              </div>
            </li>
          )}
          
          {isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                  activeTab === "/analytics" && "bg-primary-50 text-primary-600"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/analytics");
                }}
              >
                <LineChart className="mr-3 text-lg text-gray-500" />
                <span>Analytics</span>
              </div>
            </li>
          )}
          
          {/* Classes section for both teachers and students */}
          <li className="px-3 py-2 mt-6 text-xs font-semibold text-gray-500 uppercase">Classes</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                activeTab === "/classes" && "bg-primary-50 text-primary-600"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/classes");
              }}
            >
              {isTeacher ? (
                <School className="mr-3 text-lg text-gray-500" />
              ) : (
                <GraduationCap className="mr-3 text-lg text-gray-500" />
              )}
              <span>{isTeacher ? "My Classes" : "Enrolled Classes"}</span>
            </div>
          </li>
          
          <li className="px-3 py-2 mt-6 text-xs font-semibold text-gray-500 uppercase">Profile</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer",
                activeTab === "/profile" && "bg-primary-50 text-primary-600"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/profile");
              }}
            >
              <UserCog className="mr-3 text-lg text-gray-500" />
              <span>Profile</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  );
}

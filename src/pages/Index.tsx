import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LayoutGrid } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Instagram-like Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">THE MATRIX</h1>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-xs font-bold">TM</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-md">
        {/* Welcome Story/Banner */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/50 p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-sm">
            Manage exams and find your seats instantly.
          </p>
        </div>

        {/* Feed Items */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-secondary/30 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center">
                <LayoutGrid className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Admin Portal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create exams & manage allocations
                </p>
              </div>
              <Button
                onClick={() => navigate("/admin")}
                className="w-full btn-primary rounded-xl"
              >
                Admin Login
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-secondary/30 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Student Portal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Find your seat instantly
                </p>
              </div>
              <Button
                onClick={() => navigate("/student")}
                className="w-full btn-primary rounded-xl"
              >
                Find My Seat
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-xs text-muted-foreground font-medium">
            © 2026 Zenetive Infotech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

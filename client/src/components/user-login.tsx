import { useState } from "react";
import { useLocation } from "wouter";
import { User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserLoginProps {
  userType: "runner" | "clinician";
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function UserLogin({ userType, title, description, icon }: UserLoginProps) {
  const [userId, setUserId] = useState("");
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    if (userId.trim()) {
      setLocation(`/${userType}-selection/${userId.trim()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl flex items-center gap-3">
          {icon}
          {title}
        </CardTitle>
        <p className="text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`${userType}-id`}>Your User ID</Label>
          <Input
            id={`${userType}-id`}
            placeholder={`Enter your ${userType} ID (e.g., ${userType}1)`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyPress={handleKeyPress}
            className="mt-1"
          />
        </div>
        
        <Button 
          onClick={handleLogin}
          disabled={!userId.trim()}
          className="w-full"
          size="lg"
        >
          <UserCheck className="h-5 w-5 mr-2" />
          Access Your Code Red Events
        </Button>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, Camera, UserPlus } from 'lucide-react';
import jsQR from 'jsqr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TypingPlaceholder } from '@/components/ui/typing-placeholder';
import type { ClassInfo } from '@/contexts/app-context';


type JoinClassDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClassJoined: (classCode: string) => Promise<boolean>;
  initialCode?: string;
};

export function JoinClassDialog({ isOpen, setIsOpen, onClassJoined, initialCode }: JoinClassDialogProps) {
  const [classCode, setClassCode] = useState(initialCode || '');
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [classToJoin, setClassToJoin] = useState<ClassInfo | null>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (initialCode) {
        setClassCode(initialCode);
        checkCode(initialCode);
    }
  }, [initialCode])

  const checkCode = async (codeToCheck: string) => {
    if (!codeToCheck.trim()) return;

    setIsCheckingCode(true);
    setClassToJoin(null);
    try {
        const response = await fetch(`/api/classes/join?code=${codeToCheck}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to find class.');
        }
        const data: ClassInfo = await response.json();
        setClassToJoin(data);
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Invalid Code',
            description: error.message,
        });
    } finally {
        setIsCheckingCode(false);
    }
  }


  const handleJoin = async () => {
    if (!classCode) return;
    
    setIsJoining(true);
    const success = await onClassJoined(classCode);
    setIsJoining(false);

    if (success) {
      toast({
        title: 'Successfully joined class!',
        description: `You are now enrolled in "${classToJoin?.name}".`
      });
      resetAndClose();
    }
  };
  
  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                try {
                    const url = new URL(code.data);
                    const joinCode = url.searchParams.get('join_code');
                    if (joinCode) {
                        setClassCode(joinCode);
                        stopScan();
                        checkCode(joinCode);
                        return; // Stop the loop
                    } else {
                        toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'This QR code does not contain a valid cautie join link.' });
                        stopScan();
                        return;
                    }
                } catch (e) {
                    toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'The scanned code is not a valid URL.' });
                    stopScan();
                    return;
                }
            }
        }
    }
    if (scanMode) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  };

  const startScan = async () => {
    setScanMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            animationFrameRef.current = requestAnimationFrame(tick);
        }
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser to scan a QR code.',
      });
      setScanMode(false);
    }
  };

  const stopScan = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanMode(false);
  };

  const resetAndClose = () => {
    stopScan();
    setClassCode('');
    setClassToJoin(null);
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        resetAndClose();
    } else {
        setIsOpen(true);
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const renderContent = () => {
    if (classToJoin) {
        return (
            <div className="py-4 space-y-4">
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle>{classToJoin.name}</CardTitle>
                        <CardDescription>{classToJoin.description || 'No description provided.'}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (scanMode) {
        return (
             <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center my-4">
                <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[20px] border-black/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-[90%] border-t-4 border-b-4 border-white/50 animate-scan" />
            </div>
        )
    }

    return (
        <div className="py-4 space-y-2">
            <Label htmlFor="class-code">Class Code</Label>
            <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                id="class-code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
              />
              {!classCode && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <TypingPlaceholder
                    texts={[
                      "ABC12345",
                      "XYZ98765",
                      "DEF45678",
                      "GHI23456"
                    ]}
                    typingSpeed={150}
                    pauseTime={2000}
                  />
                </div>
              )}
            </div>
            <Button onClick={() => checkCode(classCode)} disabled={isCheckingCode || !classCode}>
                 {isCheckingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Check Code
            </Button>
            </div>
        </div>
    )
  }
  
  const renderFooter = () => {
    if (classToJoin) {
        return (
            <DialogFooter>
                <Button variant="outline" onClick={() => setClassToJoin(null)}>Back</Button>
                <Button onClick={handleJoin} disabled={isJoining}>
                    {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Confirm & Join Class
                </Button>
            </DialogFooter>
        )
    }

    if (scanMode) {
        return (
            <DialogFooter>
                <Button variant="outline" className="w-full" onClick={stopScan}>Cancel Scan</Button>
            </DialogFooter>
        )
    }
    
    return (
        <DialogFooter className="sm:flex-col sm:space-y-2">
            <Button variant="secondary" className="w-full" onClick={startScan}>
                <Camera className="mr-2 h-4 w-4" />
                Scan QR Code
            </Button>
            <Button variant="outline" className="w-full" onClick={resetAndClose}>Cancel</Button>
        </DialogFooter>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
          <DialogDescription>
            Enter the class code or scan a QR code to enroll.
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        {renderFooter()}

      </DialogContent>
    </Dialog>
  );
}

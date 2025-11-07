import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Square, RotateCcw, Zap, Moon, Sun } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useCodeExecution } from "@/hooks/use-code-execution";

interface ExecutionResult {
  output: string;
  success: boolean;
  error?: string;
  compilationTime?: string;
  executionTime?: string;
  service?: string;
}

interface ProfessionalCppIdeProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
  height?: string;
}

// C++ Code Templates
const CPP_TEMPLATES = {
  basic: {
    name: "Basic Program",
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
  },
  input: {
    name: "Input Handling", 
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a number: ";
    cin >> n;
    cout << "You entered: " << n << endl;
    return 0;
}`
  },
  array: {
    name: "Array Processing",
    code: `#include <iostream>
using namespace std;

int main() {
    int n = 5;
    int arr[n] = {1, 2, 3, 4, 5};
    
    cout << "Array elements: ";
    for(int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    return 0;
}`
  },
  function: {
    name: "Function Example",
    code: `#include <iostream>
using namespace std;

int add(int a, int b) {
    return a + b;
}

int main() {
    int x = 5, y = 3;
    int result = add(x, y);
    cout << x << " + " << y << " = " << result << endl;
    return 0;
}`
  },
  loop: {
    name: "Loop Examples",
    code: `#include <iostream>
using namespace std;

int main() {
    // For loop
    cout << "For loop: ";
    for(int i = 1; i <= 5; i++) {
        cout << i << " ";
    }
    cout << endl;
    
    // While loop
    cout << "While loop: ";
    int j = 1;
    while(j <= 5) {
        cout << j << " ";
        j++;
    }
    cout << endl;
    
    return 0;
}`
  },
  class: {
    name: "Class Example",
    code: `#include <iostream>
using namespace std;

class Rectangle {
private:
    double width, height;
    
public:
    Rectangle(double w, double h) : width(w), height(h) {}
    
    double area() {
        return width * height;
    }
    
    void display() {
        cout << "Rectangle: " << width << " x " << height;
        cout << ", Area: " << area() << endl;
    }
};

int main() {
    Rectangle rect(5.0, 3.0);
    rect.display();
    return 0;
}`
  }
};

export function ProfessionalCppIde({
  initialCode = CPP_TEMPLATES.basic.code,
  onCodeChange,
  readOnly = false,
  height = "600px"
}: ProfessionalCppIdeProps) {
  const [code, setCode] = useState(initialCode);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [userInput, setUserInput] = useState('');
  
  // Use the real-time code execution hook
  const {
    isRunning,
    output,
    error,
    inputPrompt,
    showInput,
    runCode,
    sendInput,
    stopExecution,
    clearOutput
  } = useCodeExecution();
  
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  // Execute C++ code
  const executeCode = () => {
    if (!code.trim()) {
      return;
    }
    runCode(code);
  };

  // Handle user input submission
  const handleInputSubmit = () => {
    if (userInput.trim()) {
      sendInput(userInput);
      setUserInput('');
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to execute
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
      }
      // Enter to submit input when input is shown
      if (e.key === 'Enter' && showInput && document.activeElement?.tagName === 'INPUT') {
        e.preventDefault();
        handleInputSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, userInput, showInput]);

  return (
    <Card className="w-full" style={{ height }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            C++ IDE
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </Button>
            
            <Button 
              onClick={isRunning ? stopExecution : executeCode} 
              disabled={!code.trim()}
              className={isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Run
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Shortcut: Ctrl+Enter (Run)
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ResizablePanelGroup direction="horizontal" className="min-h-0">
          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 border-b bg-muted/30">
                <span className="text-sm font-medium">Code Editor</span>
              </div>
              
              <div className="flex-1 relative">
                <textarea
                  ref={codeTextareaRef}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  readOnly={readOnly}
                  className={`
                    w-full h-full resize-none border-0 p-4 font-mono text-sm
                    focus:outline-none focus:ring-0
                    ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
                  `}
                  placeholder="Enter your C++ code here..."
                  spellCheck={false}
                  style={{ 
                    minHeight: '300px',
                    lineHeight: '1.5',
                    tabSize: 4
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const textarea = e.target as HTMLTextAreaElement;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const spaces = '    '; // 4 spaces for tab
                      const newCode = code.substring(0, start) + spaces + code.substring(end);
                      handleCodeChange(newCode);
                      setTimeout(() => {
                        textarea.setSelectionRange(start + spaces.length, start + spaces.length);
                      }, 0);
                    }
                  }}
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Console Panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium">Console</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearOutput}
                  className="text-xs px-2 py-1 h-6"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              
              <div className="flex-1 flex flex-col">
                {/* Output Area */}
                <div 
                  className={`
                    flex-1 p-3 font-mono text-sm whitespace-pre-wrap overflow-auto
                    ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}
                  `}
                >
                  {output || error || 'Ready to run code...'}
                </div>
                
                {/* Input Area (shown when program needs input) */}
                {showInput && (
                  <div className="border-t p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-2">
                      {inputPrompt}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Enter input..."
                        className="font-mono text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInputSubmit();
                          }
                        }}
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={handleInputSubmit}
                        disabled={!userInput.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
    </Card>
  );
}
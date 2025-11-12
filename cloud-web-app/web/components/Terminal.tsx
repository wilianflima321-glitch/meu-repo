'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function Terminal() {
  const [output, setOutput] = useState<string[]>(['Welcome to Aethel Terminal']);
  const [command, setCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    
    const newOutput = [...output, `$ ${cmd}`];
    setOutput(newOutput);
    
    try {
      // In real implementation, send to backend
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const result = await response.json();
      setOutput([...newOutput, result.output]);
    } catch (error) {
      setOutput([...newOutput, 'Command execution failed']);
    }
    
    setCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(command);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="terminal bg-black text-green-400 p-4 font-mono text-sm h-64 overflow-y-auto">
      <div className="output mb-2">
        {output.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <div className="aethel-flex aethel-items-center aethel-gap-2">
        <span>$ </span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-transparent border-none outline-none text-green-400"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
}

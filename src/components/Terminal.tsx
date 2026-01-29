import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import type { TaskLog } from '../types';

interface TerminalProps {
  logs: TaskLog[];
  onCommand: (command: string) => void;
}

export function Terminal({ logs, onCommand }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const commandBufferRef = useRef<string>('');

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(0, 255, 65, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#00ff41',
        yellow: '#f1fa8c',
        blue: '#5555ff',
        magenta: '#ff79c6',
        cyan: '#00ffff',
        white: '#e0e0e0',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#1ac9ff',
        brightMagenta: '#ff92df',
        brightCyan: '#1affff',
        brightWhite: '#ffffff',
      },
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    term.onData((data) => {
      if (data === '\r') { // Enter
        const command = commandBufferRef.current.trim();
        term.write('\r\n');
        if (command) {
          onCommand(command);
        }
        commandBufferRef.current = '';
        term.write('$ ');
      } else if (data === '\u007F') { // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\u0003') { // Ctrl+C
        term.write('^C\r\n$ ');
        commandBufferRef.current = '';
      } else if (data >= ' ' && data <= '~') {
        commandBufferRef.current += data;
        term.write(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [onCommand]);

  useEffect(() => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    
    // Clear everything except the prompt from the previous state
    term.clear();
    
    logs.forEach((log, index) => {
      let color = '\x1b[32m'; // Matrix green
      if (log.log_type === 'stderr') color = '\x1b[91m'; // Red
      else if (log.log_type === 'system') color = '\x1b[96m'; // Cyan for system
      
      const content = log.content.replace(/\n/g, '\r\n');
      term.write(`${color}${content}\x1b[0m\r\n`);
    });

    term.write('$ ');
    term.scrollToBottom();

  }, [logs]);

  return (
    <div className="w-full h-full bg-black p-2 rounded-lg border border-green-500/20">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
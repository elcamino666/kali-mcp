FROM kalilinux/kali-rolling:latest

# Update and install essential tools
RUN apt-get update && apt-get install -y \
    kali-tools-top10 \
    nmap \
    metasploit-framework \
    sqlmap \
    netcat-traditional \
    curl \
    wget \
    python3 \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Keep container running
CMD ["/bin/bash", "-c", "while true; do sleep 3600; done"]

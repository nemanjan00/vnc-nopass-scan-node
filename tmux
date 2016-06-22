rename-session sexify
send "node scan.js" C-m
new-window
send "sudo masscan -p5900 0.0.0.0/0 --exclude 192.168.0.1/24 --rate 5000 --output-format list --output-file ip.txt" C-m
new-window
send "watch -n5 'sort -u output.txt > hacked.txt'" C-m
new-window
send "tail -f output.txt" C-m

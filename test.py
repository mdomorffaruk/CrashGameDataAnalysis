# crash_logger_selenium.py
import csv
import time
from selenium import webdriver
# from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

WINDOW_SIZE = "800,600"

CSV_FILE = "crash_results.csv"
# Set path Selenium
CHROMEDRIVER_PATH = '/usr/local/bin/chromedriver'
# URL for the crash game (replace if needed)
GAME_URL = "https://1xbet.com/casino/?type=crash"


def init_csv():
    try:
        open(CSV_FILE).close()
    except FileNotFoundError:
        with open(CSV_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["round_id", "final_multiplier", "timestamp"])

def inject_logger(driver):
    """Inject JS hook to intercept WebSocket messages"""
    script = """
    if (!window._crashLogs) {
        window._crashLogs = [];
        const origSend = WebSocket.prototype.send;
        const origMessage = WebSocket.prototype.onmessage;

        WebSocket.prototype.send = function(data) {
            this.addEventListener('message', function(event) {
                try {
                    let parts = event.data.split("\\x1e");
                    for (let part of parts) {
                        if (!part.trim()) continue;
                        let obj = JSON.parse(part);
                        if (obj.type === 1 && obj.target === "OnCrash") {
                            let args = (obj.arguments || [{}])[0];
                            window._crashLogs.push({
                                round_id: args.l,
                                multiplier: args.f,
                                ts: args.ts
                            });
                        }
                    }
                } catch (e) {}
            });
            return origSend.apply(this, arguments);
        };
    }
    """
    driver.execute_script(script)

def fetch_new_logs(driver):
    logs = driver.execute_script("let l = window._crashLogs || []; window._crashLogs = []; return l;")
    return logs

def main():
    init_csv()

    # Launch browser (not headless)
    s = Service(CHROMEDRIVER_PATH)

    # driver.get("https://google.com")
    options = Options()
    # options.add_argument("--headless")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
    options.add_argument("--window-size=%s" % WINDOW_SIZE)
    options.add_argument('--no-sandbox')
    driver = webdriver.Chrome(service=s, options=options)

    # Open game page
    driver.get(GAME_URL)
    # time.sleep(100)  # wait for login and game load manually

    print("🌐 Current URL:", driver.current_url)
    print("✅ Page Title:", driver.title)
    # 👉 Let you login & navigate manually
    input("✅ Log in and open the crash game, then press ENTER here to start recording...")

    inject_logger(driver)

    print("📡 Listening for crash results (via browser)…")

    while True:
        new_logs = fetch_new_logs(driver)
        if new_logs:
            with open(CSV_FILE, "a", newline="") as f:
                writer = csv.writer(f)
                for log in new_logs:
                    writer.writerow([log["round_id"], log["multiplier"], log["ts"]])
                    print("✅ Logged:", log)
        time.sleep(5)

if __name__ == "__main__":
    main()

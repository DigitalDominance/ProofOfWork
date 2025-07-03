import axios from "axios";
import path from "path";
import fs from 'fs';

export class AxiomService {
    constructor() { }

    public readCookie(): string {
        try {
            const cookiePath = path.join(__dirname, '/data/cookie.txt');
            console.log(cookiePath)
            return fs.readFileSync(cookiePath, 'utf8').trim();
        } catch (e) {
            return '';
        }
    }

    public writeCookie(cookieStr: string): boolean {
        try {
            const cookiePath = path.join(__dirname, '/data/cookie.txt');
            fs.writeFileSync(cookiePath, cookieStr.trim(), 'utf8');
            return true;
        } catch (e) {
            return false;
        }
    }

    public async refreshAccessToken() {
        try {
            console.log(
                `[${new Date().toLocaleString()}] Refreshing access token...`
            );
            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                "cache-control": "no-cache",
                dnt: "1",
                origin: "https://axiom.trade",
                pragma: "no-cache",
                priority: "u=1, i",
                referer: "https://axiom.trade/",
                "sec-ch-ua":
                    '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "user-agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
                cookie: this.readCookie(),
            };

            const response = await axios.post(
                "https://api9.axiom.trade/refresh-access-token",
                null,
                {
                    headers,
                    // Disable certificate verification if necessary (not recommended in production)
                    httpsAgent: new (require("https").Agent)({
                        rejectUnauthorized: false,
                    }),
                }
            );

            if (response.status !== 200) {
                console.log(
                    `[${new Date().toLocaleString()}] Could not refresh access token!`
                );
                console.log("Response:", response.data);
                process.exit(1);
            }

            const cookies: string = response.headers["set-cookie"]
                ? (response.headers["set-cookie"] as string[]).join(" ")
                : "";
            let newCookie = "";

            const reAuthRefresh = new RegExp("auth-refresh-token=.*?;", "s").exec(cookies);
            if (reAuthRefresh) {
                newCookie += reAuthRefresh[0];
            }
            const reAuthAccess = new RegExp("auth-access-token=.*?;", "s").exec(cookies);
            if (reAuthAccess) {
                newCookie += " " + reAuthAccess[0];
            }

            if (!this.writeCookie(newCookie)) {
                throw new Error("Could not write cookie!");
            }
            console.log(`[${new Date().toLocaleString()}] Access token refreshed!`);
        } catch (e) {
            console.error(
                `[${new Date().toLocaleString()}] Could not refresh access token!`,
                e
            );
            process.exit(1);
        }
    }

    public async pulse(filters: any) {
        try {
            const payload = {
                "table": "migrated",
                filters,
                "usdPerSol": 150
            }

            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                "cache-control": "no-cache",
                dnt: "1",
                origin: "https://axiom.trade",
                pragma: "no-cache",
                priority: "u=1, i",
                referer: "https://axiom.trade/",
                "sec-ch-ua":
                    '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "user-agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
                cookie: this.readCookie(),
            };
            
            
            const response = await axios.post(
                "https://api2.axiom.trade/pulse",
                payload,
                {
                    headers,
                    // Disable certificate verification if necessary (not recommended in production)
                    httpsAgent: new (require("https").Agent)({
                        rejectUnauthorized: false,
                    }),
                }
            );        

            const data = response.data;

            console.log(`[${new Date().toLocaleString()}] data`, data)

            return data;
        } catch (e) {
            console.error(
                `[${new Date().toLocaleString()}] Could not refresh access token!`,
                e
            );
        }            
    }
}

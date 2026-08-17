# سرزمین عسل — Production Deployment Package

بستهٔ کامل نصب فروشگاه «سرزمین عسل» (سایت + ربات تلگرام) روی سرور شخصی.

---

## پیش‌نیازها

- سرور لینوکس (Debian 11+ یا Ubuntu 20.04+)
- دسترسی root (یا sudo)
- حداقل ۱ گیگابایت رم
- اتصال اینترنت
- (اختیاری) دامنهٔ شخصی برای HTTPS

---

## 🚀 نصب اولیه (از GitHub)

### مرحلهٔ ۱: اجرای نصب‌کننده

روی سرور خود، فایل `setup.sh` را اجرا کنید:

```bash
# روش ۱: اگر فقط setup.sh را دارید (از GitHub دانلود شده)
curl -o setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/sarzemine-asal/main/setup.sh
sudo bash setup.sh
# → از شما آدرس GitHub repo را می‌پرسد

# روش ۲: اگر کل پوشه را کلون کرده‌اید
git clone https://github.com/YOUR_USERNAME/sarzemine-asal.git
cd sarzemine-asal
sudo bash setup.sh
# → به‌صورت خودکار از همان پوشه نصب می‌کند
```

### مرحلهٔ ۲: پاسخ به سؤالات

نصب‌کننده از شما می‌پرسد:
- **توکن ربات تلگرام** (پیش‌فرض: توکن فعلی شما)
- **آیدی عددی ادمین تلگرام** (پیش‌فرض: ۵۲۰۷۶۵۳۱۰۴)
- **دامنه (اختیاری)** — اگر دامنه دارید وارد کنید تا SSL خودکار گرفته شود
- **ایمیل برای Let's Encrypt** (فقط اگر دامنه وارد کنید)

### مرحلهٔ ۳: تأیید نهایی

نصب‌کننده به‌صورت خودکار:
1. وابستگی‌های سیستمی (Bun, Caddy, git, ...) را نصب می‌کند
2. پروژه را در `/opt/sarzemine-asal` قرار می‌دهد
3. `.env` را با مقادیر شما می‌سازد
4. `bun install` + `next build` + `prisma db:push` + `prisma seed` را اجرا می‌کند
5. Caddy را با SSL خودکار پیکربندی می‌کند (اگر دامنه داده‌اید)
6. سرویس‌های systemd را نصب و شروع می‌کند
7. مانیتورینگ سلامت را فعال می‌کند
8. وضعیت سلامت را تأیید می‌کند

---

## 🔄 آپدیت کردن پروژه (بعد از تغییرات)

وقتی تغییراتی در پروژه ایجاد شد و به GitHub پوش شد، روی سرور اجرا کنید:

```bash
sudo bash /opt/sarzemine-asal/update.sh
```

این اسکریپت به‌طور خودکار:
1. **پشتیبان از دیتابیس** می‌گیرد (برای ایمنی)
2. `git pull origin main` را اجرا می‌کند
3. اگر `package.json` تغییر کرده باشد، `bun install` را اجرا می‌کند
4. اگر `schema.prisma` تغییر کرده باشد، `prisma generate` + `db:push` را اجرا می‌کند
5. `next build` را اجرا می‌کند
6. سرویس‌ها را restart می‌کند
7. سلامت را تأیید می‌کند

**اگر build شکست بخوره:**
- سرویس‌ها با کد قدیمی ادامه می‌دهند (حالت امن)
- ارور را به شما نشان می‌دهد
- پس از رفع مشکل، دوباره `update.sh` را اجرا کنید

**اگر خواستید برگردید به نسخه قبلی:**
```bash
cd /opt/sarzemine-asal
sudo -u sarzemine git log --oneline -5      # نشان می‌دهد کدام commit ها
sudo -u sarzemine git reset --hard <HASH>    # برگشت به نسخه قبلی
sudo bash update.sh                          # rebuild + restart
```

---

## 📋 ساختار پروژه روی سرور

```
/opt/sarzemine-asal/
├── .env                    # تنظیمات (build شده توسط setup.sh)
├── .github-repo            # آدرس GitHub repo (برای update.sh)
├── .git/                   # git history (برای update.sh)
├── package.json
├── next.config.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/                    # کد سایت
├── public/                # تصاویر و فایل‌های استاتیک
├── mini-services/
│   └── telegram-bot/      # ربات تلگرام
├── db/
│   └── custom.db          # دیتابیس (SQLite)
├── setup.sh               # نصب‌کننده (برای نصب مجدد)
├── update.sh              # آپدیت‌کننده (استفاده روزمره)
└── monitor.sh             # مانیتور سلامت (هر ۵ دقیقه)

/var/log/sarzemine-asal/   # لاگ‌ها
/var/backups/sarzemine-asal/ # پشتیبان‌های دیتابیس (قبل از هر آپدیت)
```

---

## 🔧 مدیریت سرویس‌ها

### وضعیت سرویس‌ها
```bash
systemctl status sarzemine-asal-site
systemctl status sarzemine-asal-bot
systemctl status sarzemine-asal-monitor.timer
```

### Restart دستی
```bash
sudo systemctl restart sarzemine-asal-site
sudo systemctl restart sarzemine-asal-bot
```

### مشاهدهٔ لاگ‌ها
```bash
# لاگ سایت
journalctl -u sarzemine-asal-site -f

# لاگ ربات
journalctl -u sarzemine-asal-bot -f

# لاگ مانیتور
tail -f /var/log/sarzemine-asal/monitor.log
```

---

## 🌐 پیکربندی دامنه و HTTPS

اگر هنگام نصب دامنه وارد کرده‌اید، Caddy به‌صورت خودکار:
- گواهی SSL رایگان Let's Encrypt را می‌گیرد
- آن را هر ۶۰ روز تمدید می‌کند
- HTTP را به HTTPS هدایت می‌کند
- پورت‌های ۸۰ و ۴۴۳ را مدیریت می‌کند

برای تغییر دامنه بعد از نصب، فایل `/etc/caddy/Caddyfile` را ویرایش کنید:
```bash
sudo nano /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

اگر دامنه ندارید، سایت فقط از `http://localhost:3000` قابل دسترس است.

---

## 🔒 امنیت

- پورت‌های ۳۰۰۰ (سایت) و ۳۰۰۳ (ربات) فقط از localhost قابل دسترس هستند
- فایروال (ufw) فقط SSH، HTTP و HTTPS را باز می‌گذارد
- `.env` با دسترسی `600` محافظت می‌شود
- کاربر اختصاصی `sarzemine` اجرای سرویس‌ها را برعهده دارد

---

## 📊 مانیتورینگ سلامت

اسکریپت `monitor.sh` هر ۵ دقیقه اجرا می‌شود و بررسی می‌کند:
- ✅ سایت (HTTP 200)
- ✅ ربات (health + polling)
- ✅ سرویس‌های systemd
- ✅ فضای دیسک
- ✅ حافظه

اگر مشکلی پیدا شود، پیام تلگرامی به ادمین ارسال می‌کند (با ۱۵ دقیقه cooldown تا اسپم نشود).

```bash
# اجرای دستی مانیتور
sudo bash /opt/sarzemine-asal/monitor.sh

# مشاهدهٔ لاگ مانیتور
tail -f /var/log/sarzemine-asal/monitor.log
```

---

## ❓ رفع مشکل

### سایت بالا نمی‌آید
```bash
sudo systemctl status sarzemine-asal-site
sudo journalctl -u sarzemine-asal-site -e --no-pager | tail -50
curl -I http://localhost:3000
```

### ربات کار نمی‌کند
```bash
sudo systemctl status sarzemine-asal-bot
sudo journalctl -u sarzemine-asal-bot -e --no-pager | tail -50
curl http://localhost:3003/health
```

### update.sh خطا می‌دهد
```bash
# بررسی وضعیت git
cd /opt/sarzemine-asal
sudo -u sarzemine git status
sudo -u sarzemine git log --oneline -5

# اگر build شکست خورده، لاگ کامل را ببینید
sudo -u sarzemine bash -c 'cd /opt/sarzemine-asal && /home/sarzemine/.bun/bin/bun run build'
```

### دیتابیس مشکل دارد
```bash
# پشتیبان‌گیری دستی
cp /opt/sarzemine-asal/db/custom.db ~/backup-$(date +%F).db

# بازگردانی از پشتیبان
sudo systemctl stop sarzemine-asal-site sarzemine-asal-bot
cp ~/backup-2026-08-16.db /opt/sarzemine-asal/db/custom.db
sudo chown sarzemine:sarzemine /opt/sarzemine-asal/db/custom.db
sudo systemctl start sarzemine-asal-site sarzemine-asal-bot
```

### پشتیبان‌گیری کامل
```bash
# دیتابیس + تنظیمات
sudo tar czf ~/sarzemine-backup-$(date +%F).tar.gz \
  /opt/sarzemine-asal/db/custom.db \
  /opt/sarzemine-asal/.env \
  /etc/caddy/Caddyfile
```

---

## 🔁 جریان کاری (Workflow) برای آپدیت

### برای توسعه‌دهنده (شما):
1. تغییرات لازم را در پروژه ایجاد کنید (اینجا)
2. با هم تأیید کنید که تغییرات نهایی شد
3. به GitHub پوش کنید
4. به کاربر بگویید `sudo bash /opt/sarzemine-asal/update.sh` را اجرا کند

### برای کاربر (روی سرور):
1. وقتی اطلاع‌رسانی شد که آپدیت آماده است:
2. `sudo bash /opt/sarzemine-asal/update.sh` را اجرا کنید
3. صبر کنید تا اسکریپت تمام شود (۱-۲ دقیقه)
4. تغییرات اعمال شد ✓

این تمام آنچه که باید انجام دهید است. هیچ نیاز به دستکاری فایل‌ها نیست.

---

## 📞 اطلاعات تماس

- ربات تلگرام: @MeowAboosBot
- آیدی ادمین: ۵۲۰۷۶۵۳۱۰۴
- تلفن: ۰۹۱۴۰۲۰۲۳۲۰
- شهرکرد، چهارمحال و بختیاری

---

## 📝 فایل‌های مهم

| فایل | توضیح |
|------|--------|
| `setup.sh` | نصب اولیه (یک بار اجرا) |
| `update.sh` | آپدیت پروژه (بعد از هر تغییر) |
| `monitor.sh` | مانیتور سلامت (هر ۵ دقیقه خودکار) |
| `.env` | تنظیمات محیطی (دسترسی: 600) |
| `.github-repo` | آدرس GitHub repo |
| `db/custom.db` | دیتابیس SQLite (داده‌های سفارش‌ها) |

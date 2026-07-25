import { Link } from "@tanstack/react-router";
import { Instagram, Send, Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[color:var(--charcoal)]">
      <div className="container-page py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded-sm bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--gold)]" />
            <span className="font-bold text-lg">
              <span className="text-gradient-gold">FrameAI</span> Studio
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground max-w-md">
            استودیوی تخصصی روایت سینمایی رویدادها و برندها. از فیلم عروسی و فرمالیته تا تیزر تبلیغاتی و تولید محتوای ماهانه — با کیفیت سینمایی و نگاه هنری.
          </p>
          <div className="mt-5 flex items-center gap-3 text-foreground/80">
            <a href="#" aria-label="اینستاگرام" className="p-2 rounded-md hover:text-[color:var(--gold)] hover:bg-secondary"><Instagram size={18} /></a>
            <a href="#" aria-label="تلگرام" className="p-2 rounded-md hover:text-[color:var(--gold)] hover:bg-secondary"><Send size={18} /></a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">خدمات</Link></li>
            <li><Link to="/packages" className="hover:text-[color:var(--gold)]">پکیج‌ها</Link></li>
            <li><Link to="/portfolio" className="hover:text-[color:var(--gold)]">نمونه‌کارها</Link></li>
            <li><Link to="/blog" className="hover:text-[color:var(--gold)]">وبلاگ</Link></li>
            <li><Link to="/faq" className="hover:text-[color:var(--gold)]">سوالات متداول</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">تماس با ما</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone size={14} className="text-[color:var(--gold)]" /> ۰۲۱-۰۰۰۰۰۰۰۰</li>
            <li className="flex items-center gap-2"><Mail size={14} className="text-[color:var(--gold)]" /> hello@frameai.studio</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="container-page py-4 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} FrameAI Studio. تمامی حقوق محفوظ است.</p>
          <p>«لحظه واقعی شما، با روایت سینمایی آینده»</p>
        </div>
      </div>
    </footer>
  );
}

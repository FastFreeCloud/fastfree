'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, MessageCircle, Mail, MapPin, Headphones, CheckCircle, User, Tag, Loader2, ArrowLeft, Clock, Facebook, Linkedin, Github, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/language-provider';
import SharedFooter from '@/components/SharedFooter';
import SharedNavbar from '@/components/SharedNavbar';
import { useSEOMeta } from '@/lib/use-seo';
import { motion, useInView } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { services } from '@/src/data/services';
import { siteConfig } from '@/src/data/siteConfig';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';

function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FAQ_ITEMS = [
  { qAr: 'كم تستغرق مدة تطوير المشروع؟', qEn: 'How long does project development take?', aAr: 'تختلف المدة حسب تعقيد المشروع، لكن المشاريع المتوسطة تستغرق 4-8 أسابيع.', aEn: 'Duration varies by project complexity, but medium projects take 4-8 weeks.' },
  { qAr: 'هل تقدمون دعماً فنياً بعد التسليم؟', qEn: 'Do you provide technical support after delivery?', aAr: 'نعم، نقدم دعماً فنياً مستمراً وتحديثات دورية لضمان استمرارية عمل النظام.', aEn: 'Yes, we provide continuous technical support and periodic updates.' },
  { qAr: 'ما هي تقنيات العمل المستخدمة؟', qEn: 'What technologies do you use?', aAr: 'نستخدم أحدث التقنيات مثل Next.js, React, Node.js وأطر العمل الحديثة لبناء مواقع وتطبيقات سريعة وموثوقة.', aEn: 'We use the latest technologies like Next.js, React, Node.js and modern frameworks to build fast, reliable websites and applications.' },
  { qAr: 'هل يمكنني طلب تعديلات بعد التسليم؟', qEn: 'Can I request modifications after delivery?', aAr: 'بالتأكيد، نوفر جلسات تعديل وتحسين بعد التسليم لضمان رضاك الكامل.', aEn: 'Absolutely, we offer adjustment and improvement sessions after delivery.' },
];

export default function ContactPage() {
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'contact', lang);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const siteSettings = siteConfig;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const svc = params.get('service');
      if (svc) {
        setTimeout(() => setFormData(prev => ({ ...prev, subject: svc })), 0);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Request failed');
      }
      setSubmitted(true);
    } catch {
      const mailtoSubject = encodeURIComponent(formData.subject || 'Contact request from FastFree website');
      const mailtoBody = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nSubject: ${formData.subject}\n\n${formData.message}`,
      );
      window.location.href = `mailto:${siteSettings.email}?subject=${mailtoSubject}&body=${mailtoBody}`;
    } finally {
      setSubmitting(false);
    }
  };

  const contactMethods = [
    { icon: Phone, labelAr: 'الهاتف', labelEn: 'Phone', value: siteSettings.phone, href: `tel:${siteSettings.phone.replace(/[^0-9+]/g, '')}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: MessageCircle, labelAr: 'الواتساب', labelEn: 'WhatsApp', value: siteSettings.phone, href: `https://wa.me/${(siteSettings.whatsapp || siteSettings.phone || '').replace(/[^0-9]/g, '')}`, color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: Mail, labelAr: 'البريد الإلكتروني', labelEn: 'Email', value: siteSettings.email, href: `mailto:${siteSettings.email}`, color: 'text-[var(--ff-accent)]', bg: 'bg-[var(--ff-accent)]/10' },
    { icon: MapPin, labelAr: 'العنوان', labelEn: 'Address', value: siteSettings.address, href: '#', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <SharedNavbar activePage="contact" />
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'اتصل بنا' : 'Contact Us', url: 'https://fastfree.cloud/contact' }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[10%] -left-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/15 to-[var(--ff-primary)]/10 blur-[110px]"
            animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-[10%] -right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-r from-purple-500/10 to-[var(--ff-accent)]/10 blur-[100px]"
            animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-5 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Headphones size={16} />
            {t('CONTACT_BADGE', 'نحن هنا لمساعدتك', "We're Here to Help")}
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={t('CONTACT_PAGE_TITLE', 'تواصل معنا', 'Contact Us')} />
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            {t('CONTACT_PAGE_DESC', 'مستشارونا التقنيون جاهزون لمناقشة فكرتك وتقديم عرض سعر مجاني ودراسة جدوى لمشروعك.', 'Our technical consultants are ready to discuss your idea and provide a free quote and feasibility study for your project.')}
          </p>
        </div>
      </section>

      {/* Quick Contact Cards */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactMethods.map((method, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <a
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-4 p-5 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-[var(--ff-accent)]/30 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl ${method.bg} ${method.color} flex items-center justify-center shrink-0`}>
                  <method.icon size={22} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-slate-400 block">{lang === 'ar' ? method.labelAr : method.labelEn}</span>
                  <span className="font-bold text-sm truncate block">{method.value}</span>
                </div>
              </a>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Form + Info Section */}
      <section className="max-w-7xl mx-auto px-6 pb-20 z-10 relative">
        <div className="rounded-3xl p-8 md:p-12 bg-[#090d16]/60 border border-white/10 backdrop-blur-xl shadow-2xl relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Form */}
            <FadeInSection>
              <div className={`bg-slate-950/40 border border-white/10 p-8 rounded-2xl shadow-xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                {submitted ? (
                  <div className="text-center py-12">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle size={40} />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--ff-font-heading)' }}>{t('CONTACT_SENT', 'تم إرسال رسالتك بنجاح!', 'Your message has been sent successfully!')}</h3>
                    <p className="text-slate-400 text-sm mb-6">{t('CONTACT_SENT_DESC', 'سيتواصل معك فريقنا خلال 24 ساعة.', 'Our team will contact you within 24 hours.')}</p>
                    <button onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }} className="text-[var(--ff-accent)] text-sm hover:underline cursor-pointer">
                      {t('CONTACT_SEND_ANOTHER', 'إرسال رسالة أخرى', 'Send another message')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-400 mb-2">{t('CONTACT_NAME', 'الاسم بالكامل', 'Full Name')}</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('CONTACT_NAME_PH', 'أدخل اسمك الكامل', 'Enter your full name')}
                          className="w-full bg-[#030712]/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-400 mb-2">{t('CONTACT_EMAIL', 'البريد الإلكتروني', 'Email')}</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="contact-email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t('CONTACT_EMAIL_PH', 'example@email.com', 'example@email.com')}
                            className="w-full bg-[#030712]/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="contact-phone" className="block text-xs font-semibold text-slate-400 mb-2">{t('CONTACT_PHONE', 'رقم الجوال', 'Phone Number')}</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="contact-phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder={t('CONTACT_PHONE_PH', '+20 1XX XXX XXXX', '+20 1XX XXX XXXX')}
                            className="w-full bg-[#030712]/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-400 mb-2">{t('CONTACT_SUBJECT', 'موضوع الاتصال', 'Subject')}</label>
                      <div className="relative">
                        <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="contact-subject"
                          type="text"
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder={t('CONTACT_SUBJECT_PH', 'مثال: طلب عرض سعر لتطبيق ويب', 'Example: Request a quote for a web app')}
                          className="w-full bg-[#030712]/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-400 mb-2">{t('CONTACT_MESSAGE', 'محتوى الرسالة / متطلبات المشروع', 'Message Content / Project Requirements')}</label>
                      <textarea
                        id="contact-message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t('CONTACT_MESSAGE_PH', 'اكتب تفاصيل مشروعك هنا...', 'Write your project details here...')}
                        className="w-full bg-[#030712]/60 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all resize-none placeholder:text-slate-400"
                      />
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 text-[#030712] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-base"
                        style={{ background: 'var(--ff-gradient)' }}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('CONTACT_SENDING', 'جاري إرسال الرسالة...', 'Sending message...')}
                          </>
                        ) : (
                          <>
                            {t('CONTACT_SEND', 'إرسال الرسالة', 'Send Message')}
                            <ArrowLeft size={16} className={lang === 'ar' ? '' : 'rotate-180'} />
                          </>
                        )}
                      </button>
                    </motion.div>
                  </form>
                )}
              </div>
            </FadeInSection>

            {/* Right Side Info */}
            <div className={`space-y-8 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <FadeInSection delay={0.1}>
                <div>
                  <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>{t('CONTACT_OFFICE', 'مكتبنا الرئيسي', 'Our Main Office')}</h2>
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {t('CONTACT_OFFICE_DESC', 'يسعدنا استقبالك في مكتبنا أو التواصل معنا عبر الجوال والبريد الإلكتروني للرد السريع على استشاراتك التقنية.', 'We welcome you to visit our office or contact us via phone and email for quick responses to your technical inquiries.')}
                  </p>
                </div>
              </FadeInSection>

              {/* Working Hours */}
              <FadeInSection delay={0.2}>
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <h3 className="font-bold">{t('CONTACT_HOURS', 'ساعات العمل', 'Working Hours')}</h3>
                  </div>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span>{t('CONTACT_HOURS_WEEKDAYS', 'الأحد - الخميس', 'Sun - Thu')}</span>
                      <span className="text-white font-medium">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('CONTACT_HOURS_SAT', 'السبت', 'Saturday')}</span>
                      <span className="text-white font-medium">10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('CONTACT_HOURS_FRI', 'الجمعة', 'Friday')}</span>
                      <span className="text-slate-400">{t('CONTACT_HOURS_CLOSED', 'عطلة', 'Closed')}</span>
                    </div>
                  </div>
                </div>
              </FadeInSection>

              {/* Social Links */}
              <FadeInSection delay={0.3}>
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10">
                  <h3 className="font-bold mb-4">{t('CONTACT_FOLLOW', 'تابعنا على', 'Follow Us')}</h3>
                  <div className="flex gap-3">
                    {[
                      { icon: Facebook, href: siteConfig.socialLinks.facebook, label: 'Facebook' },
                      { icon: Linkedin, href: siteConfig.socialLinks.linkedin, label: 'LinkedIn' },
                      { icon: Github, href: siteConfig.socialLinks.github, label: 'GitHub' },
                    ].filter((s) => s.href).map((s, i) => (
                      <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 transition-all" aria-label={s.label}>
                        <s.icon size={16} />
                      </a>
                    ))}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <FadeInSection>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('CONTACT_FAQ_TITLE', 'الأسئلة الشائعة', 'Frequently Asked Questions')}
            </h2>
            <p className="text-slate-400">{t('CONTACT_FAQ_DESC', 'إجابات سريعة لأكثر الاستفسارات تكراراً', 'Quick answers to the most common inquiries')}</p>
          </div>
        </FadeInSection>
        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className="rounded-2xl bg-slate-900/40 border border-white/10 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full flex items-center justify-between p-5 text-sm font-medium transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'} ${openFaq === i ? 'text-[var(--ff-accent)]' : 'text-white hover:text-[var(--ff-accent)]'}`}
                >
                  <span>{lang === 'ar' ? faq.qAr : faq.qEn}</span>
                  <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''} ${lang === 'ar' ? 'mr-3' : 'ml-3'}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">{lang === 'ar' ? faq.aAr : faq.aEn}</p>
                </motion.div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      <SharedFooter t={t} lang={lang} services={services} />
    </div>
  );
}

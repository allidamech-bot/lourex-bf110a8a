import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "en" | "ar" | "tr";

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  "nav.home": { en: "Home", ar: "الرئيسية", tr: "Ana Sayfa" },
  "nav.track": { en: "Track Shipment", ar: "تتبع الشحنة", tr: "Gönderi Takibi" },
  "nav.catalog": { en: "Factory Catalog", ar: "كتالوج المصانع", tr: "Fabrika Kataloğu" },
  "nav.orders": { en: "My Orders", ar: "طلباتي", tr: "Siparişlerim" },
  "nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم", tr: "Kontrol Paneli" },
  "nav.quote": { en: "Get a Quote", ar: "احصل على عرض سعر", tr: "Teklif Alın" },
  "nav.login": { en: "Sign In", ar: "تسجيل الدخول", tr: "Giriş Yap" },
  "nav.logout": { en: "Sign Out", ar: "تسجيل الخروج", tr: "Çıkış Yap" },
  "nav.profile": { en: "My Profile", ar: "ملفي", tr: "Profilim" },
  "nav.admin": { en: "Admin Panel", ar: "لوحة الإدارة", tr: "Yönetim Paneli" },

  // Hero
  "hero.badge": { en: "Trusted by 200+ Merchants", ar: "موثوق من قبل 200+ تاجر", tr: "200+ Tüccar Tarafından Güveniliyor" },
  "hero.title1": { en: "Your Direct Gateway to", ar: "بوابتك المباشرة إلى", tr: "Türk Fabrikalarına Doğrudan" },
  "hero.title2": { en: "Turkish Factories", ar: "المصانع التركية", tr: "Kapınız" },
  "hero.subtitle": { en: "Sourcing, Logistics, and Reliable Shipping to Saudi Arabia & Worldwide.", ar: "التوريد واللوجستيات والشحن الموثوق إلى السعودية والعالم.", tr: "Suudi Arabistan ve Dünya'ya Tedarik, Lojistik ve Güvenilir Nakliye." },
  "hero.minOrder": { en: "Minimum order: 1 Pallet", ar: "الحد الأدنى للطلب: 1 باليت", tr: "Minimum sipariş: 1 Palet" },
  "hero.track": { en: "Track Your Shipment", ar: "تتبع شحنتك", tr: "Gönderinizi Takip Edin" },
  "hero.explore": { en: "Explore Factories", ar: "استكشف المصانع", tr: "Fabrikaları Keşfedin" },
  "hero.factories": { en: "Partner Factories", ar: "مصانع شريكة", tr: "Ortak Fabrikalar" },
  "hero.pallets": { en: "Pallets Shipped", ar: "باليتات تم شحنها", tr: "Gönderilen Paletler" },
  "hero.countries": { en: "Countries Served", ar: "دول يتم خدمتها", tr: "Hizmet Verilen Ülkeler" },

  // Value Props
  "vp.title": { en: "Why", ar: "لماذا", tr: "Neden" },
  "vp.subtitle": { en: "A premium sourcing experience built for serious merchants.", ar: "تجربة توريد متميزة مصممة للتجار الجادين.", tr: "Ciddi tüccarlar için tasarlanmış premium tedarik deneyimi." },
  "vp.verified": { en: "Verified Factories", ar: "مصانع موثوقة", tr: "Doğrulanmış Fabrikalar" },
  "vp.verifiedDesc": { en: "Every factory in our network is vetted and audited for quality standards.", ar: "كل مصنع في شبكتنا تم فحصه ومراجعته لمعايير الجودة.", tr: "Ağımızdaki her fabrika kalite standartları için denetlenir." },
  "vp.logistics": { en: "End-to-End Logistics", ar: "لوجستيات شاملة", tr: "Uçtan Uca Lojistik" },
  "vp.logisticsDesc": { en: "From factory floor to your warehouse — we handle every mile.", ar: "من أرضية المصنع إلى مستودعك — نتولى كل ميل.", tr: "Fabrika zemininden deponuza — her kilometreyi biz yönetiriz." },
  "vp.tracking": { en: "Real-Time Tracking", ar: "تتبع مباشر", tr: "Gerçek Zamanlı Takip" },
  "vp.trackingDesc": { en: "Monitor your shipments at every stage with live status updates.", ar: "راقب شحناتك في كل مرحلة مع تحديثات حية.", tr: "Gönderilerinizi canlı durum güncellemeleriyle her aşamada izleyin." },
  "vp.global": { en: "Global Reach", ar: "وصول عالمي", tr: "Küresel Erişim" },
  "vp.globalDesc": { en: "Shipping to Saudi Arabia, the Gulf, and 35+ countries worldwide.", ar: "الشحن إلى السعودية والخليج و35+ دولة حول العالم.", tr: "Suudi Arabistan, Körfez ve dünya genelinde 35+ ülkeye nakliye." },

  // Tracker
  "track.title": { en: "Track Your", ar: "تتبع", tr: "Gönderinizi" },
  "track.titleHighlight": { en: "Shipment", ar: "شحنتك", tr: "Takip Edin" },
  "track.subtitle": { en: "Enter your tracking ID to see real-time shipment status.", ar: "أدخل رقم التتبع لمعرفة حالة الشحنة.", tr: "Gönderi durumunu görmek için takip numaranızı girin." },
  "track.placeholder": { en: "Enter Tracking ID (e.g. LRX-2024-001)", ar: "أدخل رقم التتبع (مثال: LRX-2024-001)", tr: "Takip Numarası Girin (ör. LRX-2024-001)" },
  "track.button": { en: "Track", ar: "تتبع", tr: "Takip Et" },
  "track.searching": { en: "Searching...", ar: "جاري البحث...", tr: "Aranıyor..." },
  "track.notFound": { en: "No shipment found. Try: LRX-2024-001, LRX-2024-002, or LRX-2024-003", ar: "لم يتم العثور على شحنة. جرب: LRX-2024-001", tr: "Gönderi bulunamadı. Deneyin: LRX-2024-001" },
  "track.error": { en: "Something went wrong. Please try again.", ar: "حدث خطأ. حاول مرة أخرى.", tr: "Bir hata oluştu. Tekrar deneyin." },
  "track.trackingId": { en: "Tracking ID", ar: "رقم التتبع", tr: "Takip No" },
  "track.client": { en: "Client", ar: "العميل", tr: "Müşteri" },
  "track.destination": { en: "Destination", ar: "الوجهة", tr: "Varış Yeri" },
  "track.pallets": { en: "Pallets", ar: "باليتات", tr: "Paletler" },
  "track.weight": { en: "Weight", ar: "الوزن", tr: "Ağırlık" },

  // Stages
  "stage.factory": { en: "Factory", ar: "المصنع", tr: "Fabrika" },
  "stage.warehouse": { en: "Warehouse", ar: "المستودع", tr: "Depo" },
  "stage.shipping": { en: "Shipping", ar: "الشحن", tr: "Nakliye" },
  "stage.customs": { en: "Customs", ar: "الجمارك", tr: "Gümrük" },
  "stage.delivered": { en: "Delivered", ar: "تم التسليم", tr: "Teslim Edildi" },

  // Footer
  "footer.tagline": { en: "Premium Factory Sourcing & Logistics.", ar: "توريد مصانع ولوجستيات متميزة.", tr: "Premium Fabrika Tedarik ve Lojistik." },

  // Catalog
  "catalog.title": { en: "Factory", ar: "كتالوج", tr: "Fabrika" },
  "catalog.titleHighlight": { en: "Catalog", ar: "المصانع", tr: "Kataloğu" },
  "catalog.subtitle": { en: "Premium Turkish manufacturers vetted for quality, capacity, and reliability.", ar: "مصنعون أتراك متميزون تم فحصهم للجودة والقدرة والموثوقية.", tr: "Kalite, kapasite ve güvenilirlik için denetlenmiş premium Türk üreticileri." },
  "catalog.all": { en: "All", ar: "الكل", tr: "Tümü" },
  "catalog.getQuote": { en: "Get Bulk Quote", ar: "احصل على عرض بالجملة", tr: "Toplu Teklif Alın" },
  "catalog.min": { en: "Min:", ar: "الحد الأدنى:", tr: "Min:" },
  "catalog.products": { en: "Products", ar: "المنتجات", tr: "Ürünler" },
  "catalog.viewProducts": { en: "View Products", ar: "عرض المنتجات", tr: "Ürünleri Görüntüle" },
  "catalog.verified": { en: "Verified", ar: "موثق", tr: "Doğrulanmış" },
  "catalog.loading": { en: "Loading factories...", ar: "جاري تحميل المصانع...", tr: "Fabrikalar yükleniyor..." },
  "catalog.noFactories": { en: "No factories found.", ar: "لم يتم العثور على مصانع.", tr: "Fabrika bulunamadı." },

  // Inquiry modal
  "inquiry.title": { en: "Request a Quote", ar: "طلب عرض سعر", tr: "Teklif İsteyin" },
  "inquiry.name": { en: "Full Name", ar: "الاسم الكامل", tr: "Ad Soyad" },
  "inquiry.email": { en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  "inquiry.phone": { en: "Phone", ar: "الهاتف", tr: "Telefon" },
  "inquiry.company": { en: "Company", ar: "الشركة", tr: "Şirket" },
  "inquiry.message": { en: "Message", ar: "الرسالة", tr: "Mesaj" },
  "inquiry.submit": { en: "Submit Inquiry", ar: "إرسال الاستفسار", tr: "Başvuruyu Gönder" },
  "inquiry.success": { en: "Inquiry submitted successfully!", ar: "تم إرسال الاستفسار بنجاح!", tr: "Başvuru başarıyla gönderildi!" },
  "inquiry.sending": { en: "Sending...", ar: "جاري الإرسال...", tr: "Gönderiliyor..." },

  // Dashboard
  "dash.title": { en: "Client", ar: "لوحة تحكم", tr: "Müşteri" },
  "dash.titleHighlight": { en: "Dashboard", ar: "العميل", tr: "Paneli" },
  "dash.signout": { en: "Sign Out", ar: "تسجيل الخروج", tr: "Çıkış Yap" },
  "dash.active": { en: "Active Shipments", ar: "شحنات نشطة", tr: "Aktif Gönderiler" },
  "dash.totalPallets": { en: "Total Pallets", ar: "إجمالي الباليتات", tr: "Toplam Paletler" },
  "dash.totalWeight": { en: "Total Weight", ar: "إجمالي الوزن", tr: "Toplam Ağırlık" },
  "dash.overview": { en: "Shipment Overview", ar: "نظرة عامة على الشحنات", tr: "Gönderi Genel Bakışı" },
  "dash.noShipments": { en: "No shipments found.", ar: "لم يتم العثور على شحنات.", tr: "Gönderi bulunamadı." },

  // Orders (Buyer Portal)
  "orders.title": { en: "My", ar: "طلباتي", tr: "Siparişlerim" },
  "orders.titleHighlight": { en: "Orders", ar: "", tr: "" },
  "orders.noOrders": { en: "No orders yet. Browse the catalog to get started.", ar: "لا توجد طلبات بعد. تصفح الكتالوج للبدء.", tr: "Henüz sipariş yok. Başlamak için kataloğa göz atın." },
  "orders.orderNumber": { en: "Order", ar: "طلب", tr: "Sipariş" },
  "orders.status": { en: "Status", ar: "الحالة", tr: "Durum" },
  "orders.amount": { en: "Total Amount", ar: "المبلغ الإجمالي", tr: "Toplam Tutar" },
  "orders.deposit": { en: "Deposit (30%)", ar: "عربون (30%)", tr: "Depozito (%30)" },
  "orders.balance": { en: "Balance (70%)", ar: "الرصيد (70%)", tr: "Bakiye (%70)" },
  "orders.paid": { en: "Paid", ar: "مدفوع", tr: "Ödendi" },
  "orders.unpaid": { en: "Pending", ar: "معلق", tr: "Beklemede" },
  "orders.documents": { en: "Documents", ar: "المستندات", tr: "Belgeler" },
  "orders.noDocuments": { en: "No documents yet.", ar: "لا توجد مستندات بعد.", tr: "Henüz belge yok." },
  "orders.viewDocs": { en: "View Documents", ar: "عرض المستندات", tr: "Belgeleri Görüntüle" },
  "orders.quantity": { en: "Qty", ar: "الكمية", tr: "Adet" },
  "orders.weight": { en: "Weight", ar: "الوزن", tr: "Ağırlık" },
  "orders.pallets": { en: "Pallets", ar: "باليتات", tr: "Paletler" },
  "orders.loginRequired": { en: "Please sign in to view your orders.", ar: "يرجى تسجيل الدخول لعرض طلباتك.", tr: "Siparişlerinizi görmek için giriş yapın." },

  // Order statuses
  "status.pending": { en: "Pending", ar: "قيد الانتظار", tr: "Beklemede" },
  "status.confirmed": { en: "Confirmed", ar: "مؤكد", tr: "Onaylandı" },
  "status.production_started": { en: "Production Started", ar: "بدأ الإنتاج", tr: "Üretim Başladı" },
  "status.production_finished": { en: "Production Finished", ar: "انتهى الإنتاج", tr: "Üretim Bitti" },
  "status.quality_check": { en: "Quality Check", ar: "فحص الجودة", tr: "Kalite Kontrol" },
  "status.shipped": { en: "Shipped", ar: "تم الشحن", tr: "Gönderildi" },
  "status.customs": { en: "Customs", ar: "الجمارك", tr: "Gümrük" },
  "status.delivered": { en: "Delivered", ar: "تم التسليم", tr: "Teslim Edildi" },

  // Cargo calculator
  "cargo.title": { en: "Cargo", ar: "حاسبة", tr: "Kargo" },
  "cargo.titleHighlight": { en: "Calculator", ar: "الشحن", tr: "Hesaplayıcı" },
  "cargo.weight": { en: "Total Weight (kg)", ar: "الوزن الإجمالي (كجم)", tr: "Toplam Ağırlık (kg)" },
  "cargo.length": { en: "Length (cm)", ar: "الطول (سم)", tr: "Uzunluk (cm)" },
  "cargo.width": { en: "Width (cm)", ar: "العرض (سم)", tr: "Genişlik (cm)" },
  "cargo.height": { en: "Height (cm)", ar: "الارتفاع (سم)", tr: "Yükseklik (cm)" },
  "cargo.calculate": { en: "Calculate", ar: "احسب", tr: "Hesapla" },
  "cargo.estPallets": { en: "Estimated Pallets", ar: "الباليتات المقدرة", tr: "Tahmini Paletler" },
  "cargo.estCost": { en: "Estimated Shipping", ar: "تكلفة الشحن المقدرة", tr: "Tahmini Nakliye" },
  "cargo.note": { en: "Estimates based on standard pallet (120×80cm, max 1000kg). Final pricing may vary.", ar: "تقديرات بناءً على باليت قياسي (120×80 سم، أقصى 1000 كجم). قد يختلف السعر النهائي.", tr: "Standart palet bazında tahminler (120×80cm, maks 1000kg). Nihai fiyat değişebilir." },

  // Admin
  "admin.title": { en: "Admin", ar: "لوحة", tr: "Yönetim" },
  "admin.titleHighlight": { en: "Command Center", ar: "التحكم المركزية", tr: "Paneli" },
  "admin.subtitle": { en: "Manage shipments, orders, KYC & settings", ar: "إدارة الشحنات والطلبات والتوثيق والإعدادات", tr: "Gönderi, sipariş, KYC ve ayarları yönetin" },
  "admin.shipments": { en: "Shipments", ar: "الشحنات", tr: "Gönderiler" },
  "admin.orders": { en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  "admin.inquiries": { en: "Inquiries", ar: "الاستفسارات", tr: "Başvurular" },
  "admin.kyc": { en: "KYC Verification", ar: "التحقق من الهوية", tr: "KYC Doğrulama" },
  "admin.auditLogs": { en: "Audit Logs", ar: "سجل المراجعة", tr: "Denetim Kayıtları" },
  "admin.settings": { en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },
  "admin.refresh": { en: "Refresh", ar: "تحديث", tr: "Yenile" },
  "admin.addShipment": { en: "Add Shipment", ar: "إضافة شحنة", tr: "Gönderi Ekle" },
  "admin.createShipment": { en: "Create Shipment", ar: "إنشاء شحنة", tr: "Gönderi Oluştur" },
  "admin.actions": { en: "Actions", ar: "إجراءات", tr: "İşlemler" },
  "admin.type": { en: "Type", ar: "النوع", tr: "Tür" },
  "admin.factory": { en: "Factory", ar: "المصنع", tr: "Fabrika" },
  "admin.date": { en: "Date", ar: "التاريخ", tr: "Tarih" },
  "admin.table": { en: "Table", ar: "الجدول", tr: "Tablo" },
  "admin.action": { en: "Action", ar: "الإجراء", tr: "İşlem" },
  "admin.changes": { en: "Changes", ar: "التغييرات", tr: "Değişiklikler" },
  "admin.noKyc": { en: "No KYC documents submitted yet.", ar: "لم يتم تقديم مستندات توثيق بعد.", tr: "Henüz KYC belgesi gönderilmedi." },
  "admin.noOrders": { en: "No orders yet.", ar: "لا توجد طلبات بعد.", tr: "Henüz sipariş yok." },
  "admin.noInquiries": { en: "No inquiries yet.", ar: "لا توجد استفسارات بعد.", tr: "Henüz başvuru yok." },
  "admin.noLogs": { en: "No audit logs yet.", ar: "لا توجد سجلات مراجعة بعد.", tr: "Henüz denetim kaydı yok." },
  "admin.verify": { en: "Verify", ar: "توثيق", tr: "Doğrula" },
  "admin.revoke": { en: "Revoke", ar: "إلغاء", tr: "İptal" },
  "admin.selectFactory": { en: "Link to Factory...", ar: "ربط بمصنع...", tr: "Fabrikaya Bağla..." },
  "admin.factoryLinked": { en: "Factory linked to order", ar: "تم ربط المصنع بالطلب", tr: "Fabrika siparişe bağlandı" },
  "admin.statusUpdated": { en: "Status updated", ar: "تم تحديث الحالة", tr: "Durum güncellendi" },
  "admin.paymentUpdated": { en: "Payment status updated", ar: "تم تحديث حالة الدفع", tr: "Ödeme durumu güncellendi" },
  "admin.depositRequired": { en: "Deposit must be paid before shipping", ar: "يجب دفع العربون قبل الشحن", tr: "Nakliye öncesi depozito ödenmeli" },
  "admin.homepageStats": { en: "Homepage Statistics", ar: "إحصائيات الصفحة الرئيسية", tr: "Ana Sayfa İstatistikleri" },
  "admin.accessDenied": { en: "Access Denied", ar: "الوصول مرفوض", tr: "Erişim Engellendi" },
  "admin.accessDeniedMsg": { en: "You don't have admin privileges. Contact LOUREX support to request access.", ar: "ليس لديك صلاحيات إدارية. تواصل مع دعم LOUREX لطلب الوصول.", tr: "Yönetici yetkiniz yok. Erişim istemek için LOUREX desteğiyle iletişime geçin." },

  // Factory onboarding
  "factory.signupTitle": { en: "Register Your Factory", ar: "سجّل مصنعك", tr: "Fabrikanızı Kaydedin" },
  "factory.ownerName": { en: "Owner Full Name", ar: "اسم المالك الكامل", tr: "Sahip Adı Soyadı" },
  "factory.companyName": { en: "Factory / Company Name", ar: "اسم المصنع / الشركة", tr: "Fabrika / Şirket Adı" },
  "factory.password": { en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  "factory.country": { en: "Country", ar: "البلد", tr: "Ülke" },
  "factory.next": { en: "Next: Upload Documents", ar: "التالي: رفع المستندات", tr: "İleri: Belge Yükle" },
  "factory.back": { en: "Back", ar: "رجوع", tr: "Geri" },
  "factory.createAccount": { en: "Create Factory Account", ar: "إنشاء حساب المصنع", tr: "Fabrika Hesabı Oluştur" },
  "factory.submitting": { en: "Creating account...", ar: "جاري إنشاء الحساب...", tr: "Hesap oluşturuluyor..." },
  "factory.fillAll": { en: "Please fill all required fields.", ar: "يرجى ملء جميع الحقول المطلوبة.", tr: "Lütfen tüm gerekli alanları doldurun." },
  "factory.uploadAll": { en: "Please upload all 3 required documents.", ar: "يرجى رفع المستندات الثلاثة المطلوبة.", tr: "Lütfen gerekli 3 belgeyi yükleyin." },
  "factory.docRequired": { en: "All 3 documents are mandatory for KYC verification.", ar: "المستندات الثلاثة إلزامية للتحقق من الهوية.", tr: "KYC doğrulaması için 3 belge zorunludur." },
  "factory.cr": { en: "Commercial Register (CR)", ar: "السجل التجاري", tr: "Ticaret Sicili" },
  "factory.vat": { en: "Tax Certificate (VAT)", ar: "شهادة ضريبية", tr: "Vergi Belgesi" },
  "factory.license": { en: "Industrial License", ar: "الرخصة الصناعية", tr: "Sanayi Lisansı" },
  "factory.signupSuccess": { en: "Account created! Check your email to verify, then await KYC approval.", ar: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني ثم انتظر موافقة التحقق.", tr: "Hesap oluşturuldu! E-postanızı doğrulayın, ardından KYC onayını bekleyin." },
  "factory.hasAccount": { en: "Already registered? Sign in", ar: "مسجل بالفعل؟ سجل دخولك", tr: "Zaten kayıtlı mısınız? Giriş yapın" },
  "factory.registerLink": { en: "Register as a Factory", ar: "سجّل كمصنع", tr: "Fabrika olarak kaydolun" },

  // Factory dashboard
  "factory.portal": { en: "Portal", ar: "بوابة", tr: "Portal" },
  "factory.manageProducts": { en: "Manage your products and orders", ar: "إدارة منتجاتك وطلباتك", tr: "Ürünlerinizi ve siparişlerinizi yönetin" },
  "factory.myProducts": { en: "My Products", ar: "منتجاتي", tr: "Ürünlerim" },
  "factory.listProduct": { en: "List New Product", ar: "إضافة منتج جديد", tr: "Yeni Ürün Ekle" },
  "factory.productName": { en: "Product Name", ar: "اسم المنتج", tr: "Ürün Adı" },
  "factory.moq": { en: "MOQ (e.g. 500 units)", ar: "الحد الأدنى للطلب (مثال: 500 وحدة)", tr: "MOQ (ör. 500 adet)" },
  "factory.pricePerUnit": { en: "Price per Unit ($)", ar: "السعر لكل وحدة ($)", tr: "Birim Fiyatı ($)" },
  "factory.weightPerUnit": { en: "Unit Weight (kg)", ar: "وزن الوحدة (كجم)", tr: "Birim Ağırlığı (kg)" },
  "factory.dimensions": { en: "Carton Dimensions (L×W×H cm)", ar: "أبعاد الكرتون (ط×ع×ا سم)", tr: "Koli Boyutları (U×G×Y cm)" },
  "factory.unitsPerCarton": { en: "Units per Carton", ar: "الوحدات لكل كرتون", tr: "Koli Başına Adet" },
  "factory.productDesc": { en: "Product Description", ar: "وصف المنتج", tr: "Ürün Açıklaması" },
  "factory.addProduct": { en: "Add Product", ar: "إضافة المنتج", tr: "Ürün Ekle" },
  "factory.productAdded": { en: "Product listed successfully!", ar: "تم إضافة المنتج بنجاح!", tr: "Ürün başarıyla eklendi!" },
  "factory.activeOrders": { en: "Active Orders", ar: "الطلبات النشطة", tr: "Aktif Siparişler" },
  "factory.uploadInspection": { en: "Upload Inspection", ar: "رفع معاينة", tr: "Muayene Yükle" },
  "factory.messages": { en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "factory.caption": { en: "Caption (optional)", ar: "تعليق (اختياري)", tr: "Açıklama (isteğe bağlı)" },
  "factory.upload": { en: "Upload", ar: "رفع", tr: "Yükle" },
  "factory.mediaUploaded": { en: "Inspection media uploaded!", ar: "تم رفع وسائط المعاينة!", tr: "Muayene medyası yüklendi!" },
  "factory.noFactory": { en: "No Factory Linked", ar: "لا يوجد مصنع مرتبط", tr: "Bağlı Fabrika Yok" },
  "factory.noFactoryMsg": { en: "Your account is not linked to a factory yet. Contact LOUREX support or wait for KYC approval.", ar: "حسابك غير مرتبط بمصنع بعد. تواصل مع دعم LOUREX أو انتظر موافقة التحقق.", tr: "Hesabınız henüz bir fabrikaya bağlı değil. LOUREX desteğiyle iletişime geçin veya KYC onayını bekleyin." },

  // Message center
  "msg.title": { en: "Message Center", ar: "مركز الرسائل", tr: "Mesaj Merkezi" },
  "msg.order": { en: "Order", ar: "طلب", tr: "Sipariş" },
  "msg.placeholder": { en: "Type a message...", ar: "اكتب رسالة...", tr: "Mesaj yazın..." },

  // Search
  "search.placeholder": { en: "Search orders, products, factories...", ar: "ابحث عن الطلبات، المنتجات، المصانع...", tr: "Sipariş, ürün, fabrika ara..." },

  // Consent Gate
  "consent.title": { en: "Terms & Conditions", ar: "الشروط والأحكام", tr: "Şartlar ve Koşullar" },
  "consent.description": { en: "Before accessing your dashboard, please review and accept our Terms of Service and Privacy Policy.", ar: "قبل الوصول إلى لوحة التحكم، يرجى مراجعة وقبول شروط الخدمة وسياسة الخصوصية الخاصة بنا.", tr: "Kontrol panelinize erişmeden önce lütfen Hizmet Şartlarımızı ve Gizlilik Politikamızı inceleyin ve kabul edin." },
  "consent.tosTitle": { en: "Terms of Service", ar: "شروط الخدمة", tr: "Hizmet Şartları" },
  "consent.tosContent": {
    en: "1. ACCEPTANCE: By creating an account on LOUREX, you agree to be bound by these Terms of Service. LOUREX is an international logistics and trade facilitation platform connecting buyers with verified factories in Turkey, Syria, China, and worldwide.\n\n2. ESCROW & PAYMENTS: All transactions follow a milestone-based escrow structure: 30% deposit upon order confirmation, 70% balance released only after pre-shipment inspection approval and cargo verification. Funds are held securely and are non-refundable once production commences unless otherwise agreed in writing.\n\n3. FACTORY VERIFICATION: Factories must submit valid Commercial Registration (CR), Tax/VAT Certificate, and Industrial License documents. Listing privileges are granted only after manual KYC approval by LOUREX administration. Falsified documents result in immediate and permanent account termination.\n\n4. ORDER FULFILLMENT: Orders cannot advance to shipping status without confirmed deposit payment. LOUREX provides real-time shipment tracking across 8 stages. Weight discrepancies exceeding 5% trigger automatic alerts and dispute resolution.\n\n5. LIABILITY: LOUREX acts as a trade facilitator and logistics coordinator. We are not liable for product quality beyond the scope of pre-shipment inspections. Maximum liability is limited to the service fees charged.\n\n6. TERMINATION: LOUREX reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or fail to maintain accurate documentation.",
    ar: "1. القبول: بإنشاء حساب على LOUREX، فإنك توافق على الالتزام بشروط الخدمة هذه. LOUREX هي منصة لوجستيات وتسهيل تجارة دولية تربط المشترين بالمصانع الموثقة في تركيا وسوريا والصين وحول العالم.\n\n2. الضمان والمدفوعات: تتبع جميع المعاملات هيكل ضمان قائم على المراحل: 30% مقدم عند تأكيد الطلب، 70% رصيد يُصرف فقط بعد موافقة فحص ما قبل الشحن والتحقق من البضائع. يتم الاحتفاظ بالأموال بشكل آمن وهي غير قابلة للاسترداد بمجرد بدء الإنتاج ما لم يُتفق على خلاف ذلك كتابياً.\n\n3. التحقق من المصانع: يجب على المصانع تقديم السجل التجاري وشهادة الضريبة/القيمة المضافة والرخصة الصناعية. تُمنح صلاحيات الإدراج فقط بعد موافقة التحقق اليدوي من إدارة LOUREX.\n\n4. تنفيذ الطلبات: لا يمكن تقدم الطلبات إلى حالة الشحن دون تأكيد دفع المقدم. توفر LOUREX تتبع شحنات في الوقت الفعلي عبر 8 مراحل.\n\n5. المسؤولية: تعمل LOUREX كميسر تجاري ومنسق لوجستي. لسنا مسؤولين عن جودة المنتج خارج نطاق فحوصات ما قبل الشحن.\n\n6. الإنهاء: تحتفظ LOUREX بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.",
    tr: "1. KABUL: LOUREX'te hesap oluşturarak bu Hizmet Şartlarına bağlı olmayı kabul edersiniz. LOUREX, alıcıları Türkiye, Suriye, Çin ve dünya genelindeki doğrulanmış fabrikalarla buluşturan uluslararası bir lojistik ve ticaret platformudur.\n\n2. EMANET VE ÖDEMELER: Tüm işlemler kilometre taşı bazlı emanet yapısını takip eder: sipariş onayında %30 depozito, %70 bakiye yalnızca sevkiyat öncesi muayene onayı ve kargo doğrulamasından sonra serbest bırakılır.\n\n3. FABRİKA DOĞRULAMASI: Fabrikalar geçerli Ticaret Sicil Belgesi, Vergi/KDV Belgesi ve Sanayi Ruhsatı sunmalıdır. Listeleme yetkileri yalnızca LOUREX yönetimi tarafından manuel KYC onayından sonra verilir.\n\n4. SİPARİŞ YERİNE GETİRME: Siparişler, onaylanmış depozito ödemesi olmadan sevkiyat durumuna ilerleyemez.\n\n5. SORUMLULUK: LOUREX, ticaret kolaylaştırıcısı ve lojistik koordinatörü olarak hareket eder.\n\n6. FESİH: LOUREX, bu şartları ihlal eden hesapları askıya alma veya sonlandırma hakkını saklı tutar."
  },
  "consent.privacyTitle": { en: "Privacy Policy", ar: "سياسة الخصوصية", tr: "Gizlilik Politikası" },
  "consent.privacyContent": {
    en: "DATA COLLECTION: LOUREX collects personal information including full name, email address, phone number, company details, country of operation, and trade documentation (Commercial Register, Tax Certificates, Industrial Licenses). For factories, we additionally collect product catalogs, inspection media, and production data.\n\nDATA SECURITY: All KYC documents and sensitive files are stored with encryption at rest. Access is strictly controlled through Role-Based Access Control (RBAC). Only authorized administrators can view KYC documentation.\n\nDATA USAGE: Your data is used exclusively for: (a) account verification and KYC compliance, (b) order processing and logistics coordination, (c) communication regarding your transactions, (d) platform improvement and analytics.\n\nTHIRD PARTIES: We do not sell or share your personal data with third parties for marketing purposes. Data may be shared with shipping carriers solely for logistics fulfillment.\n\nCONSENT LOGGING: All consent actions are recorded with your IP address, device information, and precise timestamp for full legal compliance and audit trail purposes.\n\nDATA RIGHTS: You may request access to, correction of, or deletion of your personal data by contacting LOUREX support. Account deletion requests are processed within 30 business days.",
    ar: "جمع البيانات: تجمع LOUREX المعلومات الشخصية بما في ذلك الاسم الكامل والبريد الإلكتروني ورقم الهاتف وتفاصيل الشركة وبلد العمل والوثائق التجارية (السجل التجاري، شهادات الضرائب، الرخص الصناعية).\n\nأمن البيانات: يتم تخزين جميع وثائق التحقق والملفات الحساسة بتشفير أثناء التخزين. يتم التحكم في الوصول بشكل صارم من خلال التحكم في الوصول القائم على الأدوار (RBAC).\n\nاستخدام البيانات: تُستخدم بياناتك حصرياً لـ: (أ) التحقق من الحساب والامتثال، (ب) معالجة الطلبات وتنسيق اللوجستيات، (ج) التواصل بشأن معاملاتك.\n\nالأطراف الثالثة: لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة لأغراض تسويقية.\n\nتسجيل الموافقة: يتم تسجيل جميع إجراءات الموافقة مع عنوان IP ومعلومات الجهاز والطابع الزمني الدقيق للامتثال القانوني.\n\nحقوق البيانات: يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها بالاتصال بدعم LOUREX.",
    tr: "VERİ TOPLAMA: LOUREX, tam ad, e-posta adresi, telefon numarası, şirket bilgileri, faaliyet ülkesi ve ticaret belgeleri dahil kişisel bilgileri toplar.\n\nVERİ GÜVENLİĞİ: Tüm KYC belgeleri ve hassas dosyalar şifreleme ile saklanır. Erişim, Rol Tabanlı Erişim Kontrolü (RBAC) ile sıkı bir şekilde kontrol edilir.\n\nVERİ KULLANIMI: Verileriniz yalnızca şu amaçlarla kullanılır: (a) hesap doğrulama ve KYC uyumu, (b) sipariş işleme ve lojistik koordinasyonu, (c) işlemlerinizle ilgili iletişim.\n\nÜÇÜNCÜ TARAFLAR: Kişisel verilerinizi pazarlama amacıyla üçüncü taraflarla satmaz veya paylaşmayız.\n\nONAY KAYDI: Tüm onay eylemleri, yasal uyumluluk için IP adresiniz, cihaz bilgileriniz ve kesin zaman damgasıyla kaydedilir.\n\nVERİ HAKLARI: Kişisel verilerinize erişim, düzeltme veya silme talebinde bulunabilirsiniz."
  },
  "consent.agreeTerms": { en: "I have read and agree to the Terms of Service", ar: "لقد قرأت ووافقت على شروط الخدمة", tr: "Hizmet Şartlarını okudum ve kabul ediyorum" },
  "consent.agreePrivacy": { en: "I have read and agree to the Privacy Policy", ar: "لقد قرأت ووافقت على سياسة الخصوصية", tr: "Gizlilik Politikasını okudum ve kabul ediyorum" },
  "consent.accept": { en: "Accept & Continue", ar: "قبول والمتابعة", tr: "Kabul Et ve Devam Et" },
  "consent.accepted": { en: "Terms accepted. Welcome to LOUREX!", ar: "تم قبول الشروط. مرحباً بكم في LOUREX!", tr: "Şartlar kabul edildi. LOUREX'e hoş geldiniz!" },
  "consent.legalNote": { en: "Your consent is recorded with timestamp, IP address, and device fingerprint for full legal compliance under international trade regulations.", ar: "يتم تسجيل موافقتك مع الطابع الزمني وعنوان IP وبصمة الجهاز للامتثال القانوني الكامل بموجب لوائح التجارة الدولية.", tr: "Onayınız, uluslararası ticaret düzenlemelerine tam yasal uyumluluk için zaman damgası, IP adresi ve cihaz parmak iziyle kaydedilir." },

  // Fiscal Engine
  "fiscal.title": { en: "Tax & Fiscal Engine", ar: "المحرك الضريبي والمالي", tr: "Vergi ve Mali Motor" },
  "fiscal.taxRates": { en: "Tax Rates", ar: "معدلات الضرائب", tr: "Vergi Oranları" },
  "fiscal.vat": { en: "VAT Rate", ar: "نسبة ضريبة القيمة المضافة", tr: "KDV Oranı" },
  "fiscal.customs": { en: "Customs Duty", ar: "الرسوم الجمركية", tr: "Gümrük Vergisi" },
  "fiscal.serviceFee": { en: "Service Fee", ar: "رسوم الخدمة", tr: "Hizmet Ücreti" },
  "fiscal.fxRates": { en: "Exchange Rates (Manual)", ar: "أسعار الصرف (يدوي)", tr: "Döviz Kurları (Manuel)" },
  "fiscal.fxDesc": { en: "Set exchange rates manually. Base currency: USD.", ar: "حدد أسعار الصرف يدوياً. العملة الأساسية: دولار أمريكي.", tr: "Döviz kurlarını manuel olarak ayarlayın. Temel para birimi: USD." },
  "fiscal.escrow": { en: "Escrow Payment Structure", ar: "هيكل مدفوعات الضمان", tr: "Emanet Ödeme Yapısı" },
  "fiscal.deposit": { en: "Deposit", ar: "المقدم", tr: "Depozito" },
  "fiscal.depositDesc": { en: "Due upon order confirmation", ar: "مستحق عند تأكيد الطلب", tr: "Sipariş onayında ödenir" },
  "fiscal.balance": { en: "Balance", ar: "الرصيد", tr: "Bakiye" },
  "fiscal.balanceDesc": { en: "Released after inspection approval", ar: "يُصرف بعد موافقة الفحص", tr: "Muayene onayından sonra serbest bırakılır" },
  "fiscal.escrowNote": { en: "Funds are locked until milestone verification. Orders cannot ship without confirmed deposit.", ar: "الأموال مقفلة حتى التحقق من المراحل. لا يمكن شحن الطلبات دون تأكيد المقدم.", tr: "Fonlar, kilometre taşı doğrulamasına kadar kilitlenir. Siparişler onaylanmış depozito olmadan gönderilemez." },
  "fiscal.saveAll": { en: "Save All", ar: "حفظ الكل", tr: "Tümünü Kaydet" },
  "fiscal.saved": { en: "Fiscal settings saved!", ar: "تم حفظ الإعدادات المالية!", tr: "Mali ayarlar kaydedildi!" },

  // Navigation extras
  "nav.about": { en: "About", ar: "من نحن", tr: "Hakkımızda" },
  "nav.whyLourex": { en: "Why LOUREX", ar: "لماذا LOUREX", tr: "Neden LOUREX" },

  // About page
  "about.title": { en: "About", ar: "عن", tr: "Hakkında" },
  "about.titleHighlight": { en: "LOUREX", ar: "LOUREX", tr: "LOUREX" },
  "about.intro": { en: "LOUREX is a global import/export and logistics hub connecting verified factories in Turkey, Syria, China, and worldwide with buyers across Saudi Arabia, the Gulf, and 35+ countries.", ar: "LOUREX هي منصة عالمية للاستيراد والتصدير واللوجستيات تربط المصانع الموثقة في تركيا وسوريا والصين وحول العالم بالمشترين في السعودية والخليج و35+ دولة.", tr: "LOUREX, Türkiye, Suriye, Çin ve dünya genelindeki doğrulanmış fabrikaları Suudi Arabistan, Körfez ve 35+ ülkedeki alıcılarla buluşturan küresel bir ithalat/ihracat ve lojistik merkezidir." },
  "about.pillar1Title": { en: "Global Trade Network", ar: "شبكة تجارة عالمية", tr: "Küresel Ticaret Ağı" },
  "about.pillar1Desc": { en: "Direct partnerships with verified manufacturers across Turkey, China, Syria, and emerging markets worldwide.", ar: "شراكات مباشرة مع مصنعين موثقين في تركيا والصين وسوريا والأسواق الناشئة حول العالم.", tr: "Türkiye, Çin, Suriye ve dünya genelindeki doğrulanmış üreticilerle doğrudan ortaklıklar." },
  "about.pillar2Title": { en: "Security & Compliance", ar: "الأمان والامتثال", tr: "Güvenlik ve Uyumluluk" },
  "about.pillar2Desc": { en: "Mandatory KYC verification, encrypted document storage, milestone-based escrow payments, and full audit trails.", ar: "التحقق الإلزامي من الهوية، تخزين مستندات مشفر، مدفوعات ضمان قائمة على المراحل، وسجلات مراجعة كاملة.", tr: "Zorunlu KYC doğrulaması, şifreli belge depolama, kilometre taşı bazlı emanet ödemeleri ve tam denetim izi." },
  "about.pillar3Title": { en: "End-to-End Logistics", ar: "لوجستيات شاملة", tr: "Uçtan Uca Lojistik" },
  "about.pillar3Desc": { en: "From factory floor to your warehouse — real-time tracking across 8 stages, pre-shipment inspections, and LCL consolidation.", ar: "من أرضية المصنع إلى مستودعك — تتبع فوري عبر 8 مراحل، فحوصات ما قبل الشحن، وتجميع الحاويات.", tr: "Fabrika zemininden deponuza — 8 aşamada gerçek zamanlı takip, sevkiyat öncesi muayeneler ve LCL konsolidasyonu." },
  "about.pillar4Title": { en: "Trusted by Merchants", ar: "موثوق من التجار", tr: "Tüccarlar Tarafından Güvenilen" },
  "about.pillar4Desc": { en: "200+ merchants across Saudi Arabia, the Gulf, and worldwide rely on LOUREX for premium sourcing and reliable shipping.", ar: "أكثر من 200 تاجر في السعودية والخليج وحول العالم يعتمدون على LOUREX للتوريد المتميز والشحن الموثوق.", tr: "Suudi Arabistan, Körfez ve dünya genelinde 200+ tüccar premium tedarik ve güvenilir nakliye için LOUREX'e güveniyor." },
  "about.body": { en: "Founded with the mission to simplify international trade, LOUREX bridges the gap between quality manufacturers and serious importers. Our platform handles everything from factory vetting and KYC compliance to cargo tracking and customs clearance.\n\nWe believe in transparency, security, and reliability — every transaction is protected by our milestone-based escrow system, every factory is manually verified, and every shipment is tracked in real-time.", ar: "تأسست LOUREX بمهمة تبسيط التجارة الدولية، لتسد الفجوة بين المصنعين ذوي الجودة والمستوردين الجادين. تتولى منصتنا كل شيء من فحص المصانع والامتثال إلى تتبع البضائع والتخليص الجمركي.\n\nنؤمن بالشفافية والأمان والموثوقية — كل معاملة محمية بنظام الضمان القائم على المراحل، وكل مصنع يتم التحقق منه يدوياً، وكل شحنة يتم تتبعها في الوقت الفعلي.", tr: "Uluslararası ticareti basitleştirme misyonuyla kurulan LOUREX, kaliteli üreticiler ile ciddi ithalatçılar arasındaki boşluğu doldurur. Platformumuz, fabrika denetiminden KYC uyumuna, kargo takibinden gümrük işlemlerine kadar her şeyi yönetir.\n\nŞeffaflığa, güvenliğe ve güvenilirliğe inanıyoruz — her işlem kilometre taşı bazlı emanet sistemimizle korunur, her fabrika manuel olarak doğrulanır ve her gönderi gerçek zamanlı takip edilir." },

  // Why LOUREX page
  "why.title": { en: "Why", ar: "لماذا", tr: "Neden" },
  "why.titleHighlight": { en: "LOUREX?", ar: "LOUREX؟", tr: "LOUREX?" },
  "why.subtitle": { en: "Six reasons why serious merchants choose LOUREX as their sourcing and logistics partner.", ar: "ستة أسباب تجعل التجار الجادين يختارون LOUREX كشريك توريد ولوجستيات.", tr: "Ciddi tüccarların tedarik ve lojistik ortağı olarak LOUREX'i seçmesinin altı nedeni." },
  "why.reason1Title": { en: "Verified Factory Network", ar: "شبكة مصانع موثقة", tr: "Doğrulanmış Fabrika Ağı" },
  "why.reason1Desc": { en: "Every factory undergoes mandatory KYC verification — Commercial Register, Tax Certificate, and Industrial License must be approved before any product listing.", ar: "كل مصنع يخضع للتحقق الإلزامي — السجل التجاري وشهادة الضريبة والرخصة الصناعية يجب الموافقة عليها قبل أي إدراج للمنتجات.", tr: "Her fabrika zorunlu KYC doğrulamasından geçer — Ticaret Sicili, Vergi Belgesi ve Sanayi Ruhsatı ürün listelenmeden önce onaylanmalıdır." },
  "why.reason2Title": { en: "Milestone-Based Escrow", ar: "ضمان قائم على المراحل", tr: "Kilometre Taşı Bazlı Emanet" },
  "why.reason2Desc": { en: "30% deposit locks your order, 70% balance is released only after pre-shipment inspection and cargo verification. Your funds are protected at every stage.", ar: "30% مقدم يؤمن طلبك، 70% رصيد يُصرف فقط بعد فحص ما قبل الشحن والتحقق من البضائع. أموالك محمية في كل مرحلة.", tr: "%30 depozito siparişinizi kilitler, %70 bakiye yalnızca sevkiyat öncesi muayene ve kargo doğrulamasından sonra serbest bırakılır." },
  "why.reason3Title": { en: "Real-Time Shipment Tracking", ar: "تتبع شحنات في الوقت الفعلي", tr: "Gerçek Zamanlı Gönderi Takibi" },
  "why.reason3Desc": { en: "Track your cargo across 8 stages from order confirmation to delivery. Get live notifications for every status change.", ar: "تتبع بضائعك عبر 8 مراحل من تأكيد الطلب إلى التسليم. احصل على إشعارات حية لكل تغيير في الحالة.", tr: "Kargonuzu sipariş onayından teslimata kadar 8 aşamada takip edin. Her durum değişikliği için canlı bildirimler alın." },
  "why.reason4Title": { en: "Pre-Shipment Inspection Vault", ar: "خزنة فحص ما قبل الشحن", tr: "Sevkiyat Öncesi Muayene Kasası" },
  "why.reason4Desc": { en: "Factories upload HD photos and videos of cargo loading. You see exactly what's being shipped before the balance payment is released.", ar: "المصانع ترفع صور وفيديوهات عالية الدقة لتحميل البضائع. ترى بالضبط ما يتم شحنه قبل صرف الرصيد.", tr: "Fabrikalar kargo yüklemesinin HD fotoğraflarını ve videolarını yükler. Bakiye ödemesi serbest bırakılmadan önce neyin gönderildiğini tam olarak görürsünüz." },
  "why.reason5Title": { en: "Multi-Currency & Tax Engine", ar: "محرك متعدد العملات والضرائب", tr: "Çoklu Para Birimi ve Vergi Motoru" },
  "why.reason5Desc": { en: "Trade in USD, SAR, TRY, EUR, or SYP with manual exchange rate management. VAT, customs duties, and service fees are transparently calculated.", ar: "تداول بالدولار والريال والليرة واليورو أو الليرة السورية مع إدارة يدوية لأسعار الصرف. الضرائب والرسوم الجمركية ورسوم الخدمة محسوبة بشفافية.", tr: "USD, SAR, TRY, EUR veya SYP ile ticaret yapın. KDV, gümrük vergileri ve hizmet ücretleri şeffaf bir şekilde hesaplanır." },
  "why.reason6Title": { en: "Legal Protection & Audit Trail", ar: "حماية قانونية وسجل مراجعة", tr: "Yasal Koruma ve Denetim İzi" },
  "why.reason6Desc": { en: "Every action is logged with User ID, IP, device, and timestamp. Digital consent records ensure 100% legal compliance under international trade regulations.", ar: "كل إجراء يتم تسجيله بمعرف المستخدم وعنوان IP والجهاز والطابع الزمني. سجلات الموافقة الرقمية تضمن الامتثال القانوني الكامل.", tr: "Her eylem Kullanıcı Kimliği, IP, cihaz ve zaman damgasıyla kaydedilir. Dijital onay kayıtları uluslararası ticaret düzenlemelerine %100 yasal uyumluluk sağlar." },

  // Ghost Monitor
  "ghost.title": { en: "Ghost Monitor", ar: "المراقب الخفي", tr: "Hayalet Monitör" },
  "ghost.subtitle": { en: "Real-time view of all platform communications", ar: "عرض مباشر لجميع اتصالات المنصة", tr: "Tüm platform iletişimlerinin gerçek zamanlı görünümü" },
  "ghost.live": { en: "Live", ar: "مباشر", tr: "Canlı" },
  "ghost.noMessages": { en: "No messages yet.", ar: "لا توجد رسائل بعد.", tr: "Henüz mesaj yok." },

  // Content Editor
  "admin.contentEditor": { en: "Page Content", ar: "محتوى الصفحات", tr: "Sayfa İçeriği" },
  "admin.contentEditorDesc": { en: "Edit About, Why LOUREX, Privacy & Terms pages without code", ar: "تعديل صفحات من نحن، لماذا LOUREX، الخصوصية والشروط بدون كود", tr: "Hakkımızda, Neden LOUREX, Gizlilik ve Şartlar sayfalarını kodsuz düzenleyin" },
  "admin.contentSaved": { en: "Page content saved!", ar: "تم حفظ محتوى الصفحة!", tr: "Sayfa içeriği kaydedildi!" },

  // Legal
  "legal.lastUpdated": { en: "Last Updated", ar: "آخر تحديث", tr: "Son Güncelleme" },

  // Security (OTP)
  "security.otpRequired": { en: "OTP Verification Required", ar: "مطلوب رمز التحقق", tr: "OTP Doğrulaması Gerekli" },

  // Map / Tracking
  "map.title": { en: "Live Tracking Radar", ar: "رادار التتبع المباشر", tr: "Canlı Takip Radarı" },
  "map.activeShipments": { en: "active shipments on map", ar: "شحنات نشطة على الخريطة", tr: "haritada aktif gönderiler" },
  "map.noToken": { en: "Mapbox token not configured. Contact admin to enable live map.", ar: "رمز Mapbox غير مُعد. تواصل مع المسؤول لتفعيل الخريطة.", tr: "Mapbox tokeni yapılandırılmadı. Canlı haritayı etkinleştirmek için yöneticiyle iletişime geçin." },
  "map.adminHint": { en: "Admin: Go to Settings → Mapbox Token to configure.", ar: "المسؤول: اذهب إلى الإعدادات ← رمز Mapbox للتعيين.", tr: "Yönetici: Ayarlar → Mapbox Token'a gidin." },

  // Factory Applications
  "apps.title": { en: "Partner Applications", ar: "طلبات الشراكة", tr: "Ortaklık Başvuruları" },
  "apps.noApps": { en: "No partner applications yet.", ar: "لا توجد طلبات شراكة بعد.", tr: "Henüz ortaklık başvurusu yok." },
  "apps.crNumber": { en: "CR Number", ar: "رقم السجل التجاري", tr: "Ticaret Sicil No" },
  "apps.taxId": { en: "Tax ID", ar: "الرقم الضريبي", tr: "Vergi No" },
  "apps.location": { en: "Location", ar: "الموقع", tr: "Konum" },
  "apps.approve": { en: "Approve", ar: "قبول", tr: "Onayla" },
  "apps.reject": { en: "Reject", ar: "رفض", tr: "Reddet" },
  "apps.approved": { en: "Application approved! Factory record created.", ar: "تمت الموافقة على الطلب! تم إنشاء سجل المصنع.", tr: "Başvuru onaylandı! Fabrika kaydı oluşturuldu." },
  "apps.rejected": { en: "Application rejected.", ar: "تم رفض الطلب.", tr: "Başvuru reddedildi." },
  "apps.formTitle": { en: "Partner Factory Application", ar: "طلب شراكة مصنع", tr: "Ortak Fabrika Başvurusu" },
  "apps.formDesc": { en: "Submit your details for review. No account is created until LOUREX approves your application.", ar: "أرسل بياناتك للمراجعة. لن يتم إنشاء حساب حتى تتم موافقة LOUREX على طلبك.", tr: "Detaylarınızı inceleme için gönderin. LOUREX başvurunuzu onaylayana kadar hesap oluşturulmaz." },
  "apps.submit": { en: "Submit Application", ar: "إرسال الطلب", tr: "Başvuruyu Gönder" },
  "apps.thankYouTitle": { en: "Application Submitted!", ar: "تم تقديم الطلب!", tr: "Başvuru Gönderildi!" },
  "apps.thankYouDesc": { en: "Thank you for your interest in partnering with LOUREX. Our team will review your application and contact you within 2-3 business days.", ar: "شكراً لاهتمامك بالشراكة مع LOUREX. سيقوم فريقنا بمراجعة طلبك والتواصل معك خلال 2-3 أيام عمل.", tr: "LOUREX ile ortaklık ilginiz için teşekkürler. Ekibimiz başvurunuzu 2-3 iş günü içinde inceleyecek ve sizinle iletişime geçecektir." },
  "apps.field_company_name": { en: "Company / Factory Name", ar: "اسم الشركة / المصنع", tr: "Şirket / Fabrika Adı" },
  "apps.field_contact_name": { en: "Contact Person Name", ar: "اسم الشخص المسؤول", tr: "İletişim Kişisi Adı" },
  "apps.field_email": { en: "Business Email", ar: "البريد الإلكتروني التجاري", tr: "İş E-postası" },
  "apps.field_phone": { en: "Phone Number", ar: "رقم الهاتف", tr: "Telefon Numarası" },
  "apps.field_cr_number": { en: "Commercial Register (CR) Number", ar: "رقم السجل التجاري", tr: "Ticaret Sicil Numarası" },
  "apps.field_tax_id": { en: "Tax ID / VAT Number", ar: "الرقم الضريبي", tr: "Vergi Kimlik Numarası" },
  "apps.field_location": { en: "City / Country", ar: "المدينة / البلد", tr: "Şehir / Ülke" },

  // Container Simulator
  "sim.title": { en: "2D Container Loading Simulator", ar: "محاكي تحميل الحاوية ثنائي الأبعاد", tr: "2D Konteyner Yükleme Simülatörü" },
  "sim.boxLength": { en: "Box Length (cm)", ar: "طول الصندوق (سم)", tr: "Kutu Uzunluğu (cm)" },
  "sim.boxWidth": { en: "Box Width (cm)", ar: "عرض الصندوق (سم)", tr: "Kutu Genişliği (cm)" },
  "sim.boxHeight": { en: "Box Height (cm)", ar: "ارتفاع الصندوق (سم)", tr: "Kutu Yüksekliği (cm)" },
  "sim.calculate": { en: "Calculate Packing", ar: "احسب التعبئة", tr: "Paketlemeyi Hesapla" },
  "sim.totalBoxes": { en: "Total Boxes", ar: "إجمالي الصناديق", tr: "Toplam Kutu" },
  "sim.utilization": { en: "Utilization", ar: "نسبة الاستغلال", tr: "Kullanım Oranı" },
  "sim.lengthwise": { en: "Lengthwise", ar: "بالطول", tr: "Uzunlamasına" },
  "sim.widthwise": { en: "Widthwise", ar: "بالعرض", tr: "Genişliğine" },
  "sim.stacked": { en: "Stacked", ar: "مكدس", tr: "Üst Üste" },
  "sim.topView": { en: "Top-Down View", ar: "منظر علوي", tr: "Üstten Görünüm" },
  "sim.sideView": { en: "Side View", ar: "منظر جانبي", tr: "Yandan Görünüm" },

  // Payment notifications
  "payment.releaseTitle": { en: "Balance Payment Required", ar: "مطلوب دفع الرصيد", tr: "Bakiye Ödemesi Gerekli" },
  "payment.releaseDesc": { en: "Your shipment has reached its destination. Please authorize the release of the final balance.", ar: "وصلت شحنتك إلى وجهتها. يرجى تفويض إصدار الرصيد النهائي.", tr: "Gönderiniz varış noktasına ulaştı. Lütfen son bakiyenin serbest bırakılmasını yetkilendirin." },
  "payment.confirmRelease": { en: "Authorize Balance Release", ar: "تفويض إصدار الرصيد", tr: "Bakiye Serbest Bırakmayı Yetkilendir" },
  "payment.released": { en: "Balance payment authorized! Digital signature recorded.", ar: "تم تفويض دفع الرصيد! تم تسجيل التوقيع الرقمي.", tr: "Bakiye ödemesi yetkilendirildi! Dijital imza kaydedildi." },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  dir: "ltr",
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("lourex-lang") as Lang;
    return saved && ["en", "ar", "tr"].includes(saved) ? saved : "en";
  });

  // Apply dir/font on initial mount
  const applyLangSettings = useCallback((l: Lang) => {
    const htmlEl = document.documentElement;
    htmlEl.dir = l === "ar" ? "rtl" : "ltr";
    htmlEl.lang = l;
    if (l === "ar") {
      htmlEl.style.fontFamily = "'Tajawal', sans-serif";
    } else {
      htmlEl.style.fontFamily = "";
    }
  }, []);

  // Set on first render
  useState(() => { applyLangSettings(lang); });

  const handleSetLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lourex-lang", newLang);
    applyLangSettings(newLang);
  }, [applyLangSettings]);

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

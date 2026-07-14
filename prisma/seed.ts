import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const candidates = [
  ["Mert Kaya", "İstanbul", "Kadıköy", "Kiosk", "Sıcak", "Instagram"],
  ["Selin Arslan", "Ankara", "Çankaya", "Cadde Mağazası", "Çok Sıcak", "Referans"],
  ["Baran Demir", "İzmir", "Bornova", "AVM", "Ilık", "Web Form"],
  ["Ece Yılmaz", "Bursa", "Nilüfer", "Drive Thru", "Sıcak", "Fuar"],
  ["Kerem Şahin", "Antalya", "Muratpaşa", "Cadde Mağazası", "Ilık", "Saha Ekibi"],
  ["Derya Aksoy", "Konya", "Selçuklu", "Kiosk", "Soğuk", "Web Form"],
  ["Emre Çelik", "Adana", "Seyhan", "Master Franchise", "Çok Sıcak", "Referans"],
  ["Zeynep Aydın", "Muğla", "Bodrum", "AVM", "Sıcak", "Instagram"],
  ["Can Özkan", "Eskişehir", "Tepebaşı", "Cadde Mağazası", "Ilık", "Fuar"],
  ["İrem Kılıç", "Kocaeli", "İzmit", "Drive Thru", "Sıcak", "Web Form"],
  ["Onur Yıldırım", "Gaziantep", "Şahinbey", "Kiosk", "Soğuk", "Saha Ekibi"],
  ["Buse Koç", "Mersin", "Yenişehir", "AVM", "Çok Sıcak", "Referans"],
  ["Tolga Ergin", "Samsun", "Atakum", "Cadde Mağazası", "Ilık", "Instagram"],
  ["Nazlı Kurt", "Kayseri", "Melikgazi", "Drive Thru", "Sıcak", "Web Form"],
  ["Arda Polat", "Trabzon", "Ortahisar", "Kiosk", "Ilık", "Fuar"],
] as const;

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderActivity.deleteMany();
  await prisma.franchiseOrderItem.deleteMany();
  await prisma.franchiseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.document.deleteMany();
  await prisma.openingTask.deleteMany();
  await prisma.openingStage.deleteMany();
  await prisma.branchOpening.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.franchisee.deleteMany();
  await prisma.candidateTask.deleteMany();
  await prisma.candidateInteraction.deleteMany();
  await prisma.franchiseCandidate.deleteMany();
  const roleRows=await Promise.all([["Genel Müdür","GENERAL_MANAGER","Sistemin tamamına erişir."],["Operasyon Müdürü","OPERATIONS_MANAGER","Operasyonel modüllerin tamamına erişir."],["Bayi Yöneticisi","FRANCHISE_MANAGER","Bayi ve franchise operasyonlarına erişir."],["Depo Sorumlusu","WAREHOUSE_MANAGER","Depo ve sevkiyat işlemlerine erişir."]].map(([ad,kod,aciklama])=>prisma.role.create({data:{ad,kod,aciklama}})));
  const passwordHash=await hashPassword("Iceberry123!");
  const mockUsers=[["Genel Müdür","sales@iceberry.com.tr","+90 532 100 10 10","GENERAL_MANAGER"],["Yönetim Asistanı","yonetim@iceberry.local","+90 532 100 10 11","GENERAL_MANAGER"],["Operasyon Müdürü","finans@iceberry.com.tr","+90 532 200 20 20","OPERATIONS_MANAGER"],["Operasyon Uzmanı","operasyon@iceberry.local","+90 532 200 20 21","OPERATIONS_MANAGER"],["Bayi Yöneticisi","bayiyonetici@iceberry.local","+90 532 300 30 30","FRANCHISE_MANAGER"],["Bayi Operasyon Uzmanı","bayioperasyon@iceberry.local","+90 532 300 30 31","FRANCHISE_MANAGER"],["Depo Sorumlusu","depo@iceberry.local","+90 532 400 40 40","WAREHOUSE_MANAGER"],["Sevkiyat Uzmanı","sevkiyat@iceberry.local","+90 532 400 40 41","WAREHOUSE_MANAGER"]] as const;
  await prisma.user.createMany({data:mockUsers.map(([name,email,phone,role])=>({name,email,phone,role,roleId:roleRows.find(r=>r.kod===role)!.id,passwordHash}))});
  const categories = await Promise.all([
    ["Sarf Malzemeleri", "Günlük operasyon sarfları"], ["Ambalaj", "Paketleme ve servis ürünleri"],
    ["Ekipman", "Şube operasyon ekipmanları"], ["Tekstil", "Markalı tekstil ürünleri"],
    ["Temizlik", "Hijyen ve temizlik ürünleri"], ["Pazarlama", "Marka ve tanıtım materyalleri"],
  ].map(([name,description],orderIndex)=>prisma.productCategory.create({data:{name,description,orderIndex}})));
  const warehouse=await prisma.warehouse.create({data:{name:"Iceberry Merkez Depo",city:"İstanbul",district:"Ümraniye",address:"Iceberry Lojistik Merkezi",responsiblePerson:"Depo Operasyon",phone:"+90 216 555 10 10"}});
  const samples=[
    ["Iceberry Karton Bardak 12 oz","AMB-1201",0,"Koli",500,720,20,24],
    ["Logolu Taşıma Çantası","AMB-1202",1,"Paket",180,290,20,40],
    ["Barista Önlüğü","TEK-3101",3,"Adet",350,590,20,12],
    ["Tezgâh Menü Panosu","PAZ-5101",5,"Adet",1200,1850,20,5],
    ["Hijyen Başlangıç Seti","TEM-4101",4,"Set",450,690,20,10],
    ["Self Cafe Servis Tepsisi","EKP-2101",2,"Adet",280,430,20,16],
  ] as const;
  for(const [name,sku,categoryIndex,unit,purchasePrice,salePrice,vatRate,minimumStockLevel] of samples){const product=await prisma.product.create({data:{name,sku,categoryId:categories[categoryIndex].id,unit,purchasePrice,salePrice,vatRate,minimumStockLevel}});await prisma.warehouseStock.create({data:{warehouseId:warehouse.id,productId:product.id,quantity:100,reservedQuantity:0,availableQuantity:100}})}
  for (const [index, item] of candidates.entries()) {
    const [fullName, city, district, interestedConcept, temperature, source] = item;
    const lastContactAt = new Date(2026, 6, 2 + index, 10 + (index % 6), 0);
    const nextFollowUpAt = new Date(2026, 6, 18 + (index % 10), 9 + (index % 7), 30);
    const normalized = fullName.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i").replaceAll(" ", ".");
    const owner = ["Ayşe Demir", "Caner Öz", "Dilan Kaya", "Murat Efe"][index % 4];
    const candidate = await prisma.franchiseCandidate.create({
      data: {
        fullName, phone: `+90 5${30 + index} ${210 + index} ${30 + index} ${40 + index}`,
        whatsapp: `+90 5${30 + index} ${210 + index} ${30 + index} ${40 + index}`,
        email: `${normalized}@mail.com`, city, district, country: "Türkiye",
        investmentBudget: `${1 + (index % 4)},${index % 2 ? "5" : "0"} - ${2 + (index % 4)},5 milyon`, currency: "TRY",
        interestedConcept, source, status: ["Yeni Lead", "İlk Temas", "Sunum Gönderildi", "Görüşme Planlandı", "Görüşme Yapıldı", "Lokasyon Aranıyor", "Lokasyon Analizi", "Teklif Gönderildi", "Sözleşme Aşaması", "Kurulum Aşaması", "Açıldı", "Beklemede", "Kaybedildi"][index % 13], temperature,
        assignedUserId: owner,
        generalNotes: `${city} ${district} bölgesinde ${interestedConcept} konsepti için yatırım planlıyor. Operasyon ve lokasyon koşulları hakkında ayrıntılı bilgi talep etti.`,
        lastContactAt, nextFollowUpAt,
        interactions: { create: [
          { interactionType: index % 2 ? "Telefon" : "WhatsApp", title: "İlk tanışma görüşmesi", description: "Adayın yatırım hedefi, bütçe aralığı ve tercih ettiği bölge değerlendirildi.", interactionDate: lastContactAt, nextAction: "Franchise sunumunu paylaş ve bütçe teyidi al.", reminderAt: nextFollowUpAt },
          { interactionType: "E-posta", title: "Bilgilendirme dosyası gönderildi", description: "Marka sunumu, yatırım kalemleri ve ön başvuru süreci adayla paylaşıldı.", interactionDate: new Date(lastContactAt.getTime() - 3 * 86400000) },
        ] },
      },
    });
    const dueDate = new Date(2026, 6, 12 + index, 9 + (index % 6), 0);
    await prisma.candidateTask.create({ data: {
      candidateId: candidate.id,
      title: index % 3 === 0 ? "Takip görüşmesi yap" : index % 3 === 1 ? "Lokasyon bilgisini teyit et" : "Yatırım bütçesini netleştir",
      description: "Adayla planlanan sonraki aksiyonu tamamla ve sonucu görüşme notlarına ekle.",
      dueDate,
      priority: ["Düşük", "Normal", "Yüksek", "Acil"][index % 4],
      status: index % 6 === 0 ? "Tamamlandı" : index % 7 === 0 ? "Devam Ediyor" : "Açık",
      assignedUserId: owner,
      completedAt: index % 6 === 0 ? dueDate : null,
    } });
  }

  const leads = [
    ["Deniz Yalçın", "+90 532 410 22 18", "deniz.yalcin@mail.com", "İstanbul", "Instagram", "Cafe", "Yeni"],
    ["Burcu Keleş", "+90 535 221 44 09", "burcu.keles@mail.com", "Ankara", "Facebook", "Corner", "Arandı"],
    ["Ali Rıza Eren", "+90 544 812 16 30", "ali.eren@mail.com", "İzmir", "Web", "Self Cafe", "Ulaşılamadı"],
    ["Gökçe Tan", "+90 533 907 55 42", "gokce.tan@mail.com", "Bursa", "WhatsApp", "Cafe", "Randevu"],
    ["Serhat Acar", "+90 505 334 78 11", "serhat.acar@mail.com", "Antalya", "Manuel", "Corner", "Lokasyon Bekleniyor"],
    ["Pınar Özdemir", "+90 536 188 73 20", "pinar.ozdemir@mail.com", "Muğla", "Instagram", "Self Cafe", "Yeni"],
    ["Cemal Ergin", "+90 551 467 21 63", "cemal.ergin@mail.com", "Adana", "Web", "Cafe", "Reddedildi"],
    ["Sibel Koç", "+90 537 653 89 14", "sibel.koc@mail.com", "Kocaeli", "Facebook", "Corner", "Arandı"],
    ["Oğuz Karaca", "+90 542 119 45 87", "oguz.karaca@mail.com", "Samsun", "WhatsApp", "Cafe", "Randevu"],
    ["Eylül Akın", "+90 530 772 31 96", "eylul.akin@mail.com", "Mersin", "Instagram", "Self Cafe", "Yeni"],
    ["Volkan Işık", "+90 545 923 67 10", "volkan.isik@mail.com", "Konya", "Manuel", "Corner", "Adaya Dönüştürüldü"],
    ["Asena Gül", "+90 539 406 28 75", "asena.gul@mail.com", "Eskişehir", "Web", "Cafe", "Adaya Dönüştürüldü"],
  ] as const;
  for (const [index, lead] of leads.entries()) {
    const [fullName, phone, email, city, source, requestedConcept, status] = lead;
    const leadDate = index < 3 ? new Date() : new Date(2026, 6, 13 - index, 10 + (index % 5), 15);
    await prisma.lead.create({ data: { fullName, phone, email, city, source, requestedConcept, status, leadDate, activities: { create: [
      { type: "Lead geldi", description: `${source} kaynağından yeni lead kaydı oluştu.`, createdAt: leadDate },
      ...(status !== "Yeni" ? [{ type: "Durum değişti", description: `Lead durumu ${status} olarak güncellendi.`, createdAt: new Date(leadDate.getTime() + 3600000) }] : []),
    ] } } });
  }
}

main().finally(() => prisma.$disconnect());

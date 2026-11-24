export function orderPdfFilename(customer: string, now = new Date(), nonce: string = crypto.randomUUID()) {
  const name = customer.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/g, "") || "Onizleme";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  const timestamp = `${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}${part("second")}`;
  return `Iceberry-Siparis-${name}-${timestamp}-${nonce.replace(/[^a-zA-Z0-9]/g, "")}.pdf`;
}

export function orderPdfDownloadFilename(headers: Headers) {
  const supplied = headers.get("X-Iceberry-Pdf-Filename");
  return supplied && supplied.length <= 200 && /^Iceberry-Siparis-[a-zA-Z0-9-]+\.pdf$/.test(supplied)
    ? supplied : orderPdfFilename("Onizleme");
}

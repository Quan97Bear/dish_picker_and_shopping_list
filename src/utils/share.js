import QRCode from 'qrcode';

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export async function shareUrl(url) {
  if (navigator.share) return navigator.share({ title: '今晚的菜单', text: '今晚吃这些，点开看菜谱和采购清单。', url });
  await copyText(url);
  return 'copied';
}

export function renderQr(canvas, url) {
  return QRCode.toCanvas(canvas, url, { width: 220, margin: 1, color: { dark: '#26332d', light: '#fffaf2' } });
}

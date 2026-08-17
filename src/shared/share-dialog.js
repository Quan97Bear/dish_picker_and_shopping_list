import { copyText, renderQr, shareUrl } from './share.js';
import { showToast } from './toast.js';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getShareDialogCopy(hasDishes) {
  return hasDishes
    ? {
        eyebrow: '菜单已备好',
        title: '把今晚的好味分享出去',
        description: '持有链接的人可以查看菜单和建议',
        previewLabel: '预览菜单'
      }
    : {
        eyebrow: '新菜建议已备好',
        title: '把想吃的新菜分享出去',
        description: '持有链接的人可以查看这条建议',
        previewLabel: '预览建议'
      };
}

function handleDialogKeys(event, dialog, close) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (document.activeElement === dialog) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export async function openShareDialog({ root, url, hasDishes, opener }) {
  const copy = getShareDialogCopy(hasDishes);
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  const prefersCopy = !navigator.share || isWeChat;
  const modal = document.createElement('div');
  modal.className = 'drawer-backdrop';
  modal.innerHTML = `<section class="share-card" role="dialog" aria-modal="true" aria-labelledby="share-title" tabindex="-1"><button class="icon-button share-close" aria-label="关闭">×</button><span class="eyebrow">${copy.eyebrow}</span><h2 id="share-title">${copy.title}</h2><p>${copy.description}</p><p class="share-fallback-hint" ${prefersCopy ? '' : 'hidden'}>${isWeChat ? '微信内建议复制链接后发送' : '当前浏览器会直接复制链接'}</p><canvas aria-label="菜单链接二维码"></canvas><input class="share-url" readonly aria-label="菜单链接"><div class="share-actions"><button class="button ${prefersCopy ? 'secondary' : 'primary'}" data-share ${navigator.share ? '' : 'hidden'}>${prefersCopy ? '尝试系统分享' : '系统分享'}</button><button class="button ${prefersCopy ? 'primary' : 'secondary'}" data-copy>复制链接</button><a class="button ghost" data-preview>${copy.previewLabel}</a></div></section>`;
  const dialog = modal.querySelector('.share-card');
  const close = () => {
    modal.remove();
    document.body.classList.remove('no-scroll');
    root.inert = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
  modal.querySelector('input').value = url;
  modal.querySelector('[data-preview]').href = url;
  modal.addEventListener('keydown', (event) => handleDialogKeys(event, dialog, close));
  root.inert = true;
  document.body.append(modal);
  document.body.classList.add('no-scroll');
  modal.querySelector('.share-close').addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  modal.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await copyText(url);
      showToast('链接已复制');
    } catch {
      showToast('复制失败，请长按上方链接复制');
    }
  });
  modal.querySelector('[data-share]').addEventListener('click', async () => {
    try {
      const result = await shareUrl(url);
      if (result === 'copied') showToast('当前浏览器不支持系统分享，链接已复制');
      if (result === 'copied-after-failure') showToast('系统分享不可用，链接已复制');
    } catch {
      showToast('无法自动分享，请使用复制链接或二维码');
    }
  });
  dialog.focus({ preventScroll: true });
  try {
    await renderQr(modal.querySelector('canvas'), url);
  } catch {
    showToast('二维码生成失败，请复制链接');
  }
}

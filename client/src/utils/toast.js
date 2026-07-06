import { toast as reactToast } from 'react-toastify'

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const customToast = {
  success: (msg, opts) => isMobile ? alert(msg) : reactToast.success(msg, opts),
  error: (msg, opts) => isMobile ? alert(msg) : reactToast.error(msg, opts),
  info: (msg, opts) => isMobile ? alert(msg) : reactToast.info(msg, opts),
  warning: (msg, opts) => isMobile ? alert(msg) : reactToast.warning(msg, opts),
  dismiss: (id) => !isMobile && reactToast.dismiss(id)
}

export default customToast

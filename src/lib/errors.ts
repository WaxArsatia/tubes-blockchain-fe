export function toUserFacingError(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = Number(error.code)
    if (code === 4001) return "Permintaan dibatalkan di wallet."
    if (code === 4902) return "Jaringan BPJS belum ada di wallet."
  }

  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("NotAdmin"))
    return "Hanya admin yang dapat menjalankan aksi ini."
  if (message.includes("InactivePatient"))
    return "Pasien belum aktif sebagai peserta BPJS."
  if (message.includes("InactiveFaskes")) return "Wallet faskes belum aktif."
  if (message.includes("NotAuthorizedForRecord"))
    return "Akses rekam medis belum disetujui."
  if (message.includes("AccessRequestMissing"))
    return "Permintaan akses belum dibuat."
  if (message.includes("AccessRequestRevoked"))
    return "Permintaan akses sudah dicabut."
  return "Terjadi kesalahan. Coba lagi."
}

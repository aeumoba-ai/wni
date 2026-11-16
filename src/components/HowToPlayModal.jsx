import React from 'react';
import { X, Dices, Home, ShieldAlert, Coins, Users } from 'lucide-react';

export default function HowToPlayModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="kraft-card modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">CARA MAIN MONOPOLI KONOHA</h2>
          <button className="icon-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <div className="howto-list">
          <div className="howto-item">
            <div className="howto-badge"><Users size={18} /></div>
            <div>
              <strong>100% Guest & Invite Kode Room</strong>
              <p>Tanpa login atau buat akun! Cukup isi nama panggilan, pilih pion WNI favorit, buat ruangan, lalu bagikan <strong>Kode Room 6 huruf</strong> atau <strong>Link Invite</strong> ke teman. Kursi kosong bisa diisi Bot.</p>
            </div>
          </div>

          <div className="howto-item">
            <div className="howto-badge"><Dices size={18} /></div>
            <div>
              <strong>Tahan & Lepas Dadu (Acak / Ganjil / Genap)</strong>
              <p>Tahan tombol <em>Tahan Untuk Melempar</em> lalu lepaskan saat penanda berada di zona <strong>ACAK</strong>, <strong>GANJIL</strong>, atau <strong>GENAP</strong>! Dapat dadu kembar = giliran bonus (tapi 3x kembar berturut-turut langsung kena OTT KPK!).</p>
            </div>
          </div>

          <div className="howto-item">
            <div className="howto-badge"><Home size={18} /></div>
            <div>
              <strong>40 Petak Nusantara Acak Setiap Game!</strong>
              <p>Setiap permainan baru mengacak <strong>40 petak 100% lokasi Indonesia</strong> (dari Aceh sampai Papua — dipilih acak dari 48 destinasi, transportasi &amp; BUMN Nusantara!). Setiap pemain mulai dengan <strong>Rp15.000.000</strong>. Kembangkan aset jadi <em>Ruko → Gedung → Landmark</em> atau bertransaksi lewat <strong>PORTO</strong> &amp; <strong>DAGANG</strong>.</p>
            </div>
          </div>

          <div className="howto-item">
            <div className="howto-badge"><Coins size={18} /></div>
            <div>
              <strong>Kas Negara & Kartu Kebijakan / Lobi</strong>
              <p>Semua pajak (PBB &amp; Pajak Jalan) masuk ke <strong>Kas Negara</strong>. Siapa pun yang berhenti di petak Kas Negara berhak memborong seluruh jackpot-nya!</p>
            </div>
          </div>

          <div className="howto-item">
            <div className="howto-badge"><ShieldAlert size={18} /></div>
            <div>
              <strong>Rutan KPK & Kemenangan</strong>
              <p>Kalau masuk Rutan KPK, kamu bisa bayar tebusan Rp1 jt, pakai Kartu Orang Dalam, atau lempar dadu kembar. Permainan berakhir jika tersisa 1 pemain atau ronde maksimal selesai (pemenang ditentukan dari total kekayaan bersih).</p>
            </div>
          </div>
        </div>

        <button className="btn-green full-width" onClick={onClose} style={{ marginTop: 14 }}>
          SIAP MAIN!
        </button>
      </div>
    </div>
  );
}

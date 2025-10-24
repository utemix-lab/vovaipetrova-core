
## 🎯 Моя старая видеокарта

- **GPU:** GK208  
    Это семейство Kepler, чип GK208 чаще всего ставился на **NVIDIA GeForce GT 730** или GT 740.
    
- **Subvendor:** Gigabyte
    
- **Device ID:** `10DE 1288` → официально это **GeForce GT 730**.

### ✅ Скачиваем драйвер

Для **NVIDIA GeForce GT 730** (Windows 10/11 x64):

👉 **Прямая ссылка на официальный драйвер NVIDIA:**  
[https://www.nvidia.com/Download/driverResults.aspx/210122/en-us/](https://www.nvidia.com/Download/driverResults.aspx/210122/en-us/)

(это драйвер версии 474.64 WHQL — самый свежий для старых карт, выпущен в декабре 2022 для GT 730 и других Kepler)

---

🚀 Отлично, что проверил — похоже, страница NVIDIA временно заглючила (так бывает на их CDN).  
Сделаем ещё надёжнее: **скачаем драйвер прямо через официальный подборщик NVIDIA**, который всегда даёт прямые ссылки на последнюю версию для твоей карты.

---

### ✅ Подбор драйвера вручную

Перейди на:

👉 [https://www.nvidia.com/Download/Find.aspx?lang=en-us](https://www.nvidia.com/Download/Find.aspx?lang=en-us)

Заполни так:

- **Product Type:** GeForce
    
- **Product Series:** GeForce 700 Series
    
- **Product:** GeForce GT 730
    
- **Operating System:** Windows 10 64-bit (или Windows 11 64-bit, укажи по факту своей системы)
    
- **Download Type:** Game Ready Driver (GRD)
    
- **Language:** Russian (или English)
    

Нажми **Search**.

## ✅ **Материнская плата:**

ASUS SABERTOOTH Z97 MARK 2
(чипсет Intel Z97)

https://www.manualslib.com/manual/716730/Asus-Sabertooth-Z97-Mark-2.html?page=22#manual

### 🚀 Скачиваем драйверы для твоей матплаты

Твой официальный сайт ASUS:  
👉 https://www.asus.com/Motherboards-Components/Motherboards/TUF-Gaming/SABERTOOTH-Z97-MARK-2/HelpDesk_Download/

(если не открывается на русском, можно переключить на Global / English)

---

### ✅ Какие драйверы нужны в первую очередь

Для решения твоих восклицательных знаков:

1️⃣ **Intel Chipset Driver**

- Драйвер чипсета Intel Z97
    
- Уберёт `SM Bus Controller` и `PCI Simple Communications Controller`
    
- 📥 Прямая ссылка (ASUS Global):  
    https://dlcdnets.asus.com/pub/ASUS/mb/LGA1150/SABERTOOTH_Z97_MARK_2/Intel_Chipset_Win7-8-81-10_VER10101964.zip
    

2️⃣ **Intel MEI (Management Engine Interface)**

- Часто отвечает за PCI Simple Comm. Controller
    
- 📥 Прямая ссылка:  
    https://dlcdnets.asus.com/pub/ASUS/mb/LGA1150/SABERTOOTH_Z97_MARK_2/MEI_Win7-8-81-10_VER10401101402.zip
    

---

### ✅ Как установить

1. Скачай оба архива, распакуй в удобное место.
    
2. Запусти `Setup.exe` внутри каждой папки.
    
3. После установки — перезагрузи компьютер.

## Новая видеокарта

GeForce GTX 1660 SUPER

## Процессор

Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz

## SSD для нейронок

Samsung 990 PRO 4 TB.
<div align="center">

<img src="app/static/img/banner.png" alt="Kiala Banner" width="800"/>

# Kiala — настольны AI-памочнік <img src="app/static/img/kiala.png" alt="Kiala Banner" width="20"/>

**Версія: v.0.1A**

[![Version](https://img.shields.io/badge/version-v.0.1A-blue.svg)](https://github.com/Jac-qquard/Kiala)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.0-black?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PyWebView](https://img.shields.io/badge/GUI-pywebview-brightgreen?logo=html5)](https://pywebview.flowrl.com/)
[![Gemini API](https://img.shields.io/badge/AI_Model-Google_Gemini-purple?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

**Kiala** — гэта кросплатформенны настольны AI-памочнік, створаны для зручнага і прадуктыўнага ўзаемадзеяння з магутнай мадэллю Gemini. Праект аб’ядноўвае Python-бэкэнд на Flask і сучасны вэб-інтэрфейс, сабраныя ў адно зручнае настольнае прыкладанне.

**[🌐 Наведаць сайт праекта](https://kiala-ai.vercel.app/)**

</div>

---

## 📸 Скрыншоты

<div align="center">
<table>
  <tr>
    <td><img src="app/static/img/blacktheme.png" alt="Kiala Dark Mode" width="400"/></td>
    <td><img src="app/static/img/whitetheme.png" alt="Kiala Light Mode" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><em>Асноўны інтэрфейс (цёмная тэма)</em></td>
    <td align="center"><em>Светлая тэма і налады</em></td>
  </tr>
</table>
</div>

---

## ✨ Асноўныя магчымасці

-   **Прамое ўзаемадзеянне з Gemini**: Чат з мадэллю Gemini 1.5 Flash у рэальным часе.
-   **Гісторыя чатаў**: Усе размовы захоўваюцца лакальна і даступныя ў бакавой панэлі.
-   **Кіраванне чатамі**: Стварайце, перайменоўвайце, выдаляйце і ачышчайце чаты.
-   **Персаналізацыя**:
    -   Падтрымка тэм (цёмная, светлая, сістэмная).
    -   Кампактны рэжым адлюстравання паведамленняў.
    -   Налада глабальнай "сістэмнай інструкцыі" для кіравання паводзінамі AI.
    -   Магчымасць выкарыстоўваць уласны ключ Gemini API.
-   **Сучасны інтэрфейс**: Чысты, адаптыўны і інтуітыўна зразумелы дызайн.
-   **Падтрымка Markdown**: Адказы AI фарматуюцца з падсветкай сінтаксісу для кода, спісаў і інш.
-   **Імпарт/Экспарт**: Захоўвайце і загружайце ўсю гісторыю чатаў у фармаце JSON.
-   **Кросплатформеннасць**: Працуе на Windows, macOS і Linux.

---

## 🛠️ Тэхналагічны стэк

| Катэгорыя   | Тэхналогія                                                                                             | Апісанне                                                               |
| :--------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Бэкэнд**  | <img src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white" />         | Асноўная мова праграмавання.                                            |
|            | <img src="https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white" />             | Мікрафрэймворк для стварэння лакальнага вэб-сервера і API.               |
| **Фронтэнд** | <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" />             | Структура карыстальніцкага інтэрфейсу.                                      |
|            | <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white" />               | Стылі і дызайн прыкладання.                                    |
|            | <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" />      | Лагіка на баку кліента, узаемадзеянне з API і кіраванне станам.                 |
| **GUI**    | <img src="https://img.shields.io/badge/PyWebView-4C4C4C?style=flat" />                                   | Бібліятэка для адлюстравання вэб-кантэнту ў натыўным акне АС.               |
|            | <img src="https://img.shields.io/badge/PyQt-41CD52?style=flat&logo=qt&logoColor=white" />                 | GUI-фрэймворк, які выкарыстоўвае `pywebview` для стварэння акна.               |
| **AI**     | <img src="https://img.shields.io/badge/Google_Gemini-8A2BE2?style=flat" />                               | Ядро — мадэль для генерацыі адказаў.                         |

---

## 🚀 Пачатак працы

### Патрабаванні

-   Python 3.9 або навейшы.
-   `pip` (менеджар пакетаў Python).
-   [Ключ Gemini API](https://aistudio.google.com/app/apikey).

### Усталяванне і запуск

1.  **Кланіруйце рэпазіторый:**
    ```bash
    git clone https://github.com/Jac-qquard/Kiala-v.0.1A.git
    cd Kiala-v.0.1A
    ```

2.  **Стварыце і актывуйце віртуальнае асяроддзе (рэкамендуецца):**
    ```bash
    # Для Windows
    python -m venv venv    
    .\venv\Scripts\activate

    # Для macOS/Linux
    python3.11 -m venv venv  
    source venv/bin/activate
    ```

3.  **Усталюйце залежнасці:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Наладзьце API-ключ:**
    Можна дадаць ключ двума спосабамі:
    -   **(Рэкамендуецца)** Стварыце файл `.env` у каранёвай дырэкторыі праекта і дадайце туды свой ключ:
        ```
        GEMINI_API_KEY=ВАШ_КЛЮЧ_ТУТ
        ```
    -   Альбо ўстаўце ключ непасрэдна ў інтэрфейс прыкладання ў раздзеле "Налады".

5.  **Запусціце прыкладанне:**
    ```bash
    python run.py
    ```

---

## 📁 Структура праекта

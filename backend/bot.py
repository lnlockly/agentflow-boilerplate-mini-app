"""
Mini App boilerplate bot.

This file is the canonical /start handler that wires the Telegram WebApp
button. Coder agents customize MENU_BUTTONS and add /command handlers per
brief, but MUST NOT remove the WebAppInfo button — it is the entry point
to the Mini App and the platform's smoke test asserts its presence.
"""
import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ.get("BOT_TOKEN", "").strip()
PREVIEW_URL = os.environ.get("PREVIEW_URL", "").strip()

if not BOT_TOKEN:
    raise SystemExit("BOT_TOKEN is empty — set it in .env or via AgentFlow secrets.")
if not PREVIEW_URL:
    # Don't crash — bot can still run, but the WebApp button would be
    # disabled. Log loudly so the operator sees it in pod logs.
    logging.warning("PREVIEW_URL is empty — Mini App button will be replaced by a text fallback.")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("bot")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


def main_keyboard() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    if PREVIEW_URL.startswith("https://"):
        rows.append([
            InlineKeyboardButton(
                text="🚀 Open App",
                web_app=WebAppInfo(url=PREVIEW_URL),
            ),
        ])
    else:
        rows.append([
            InlineKeyboardButton(text="ℹ️ App not ready yet", callback_data="noop"),
        ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@dp.message(Command("start"))
async def on_start(message: Message) -> None:
    await message.answer(
        "Привет! Нажми кнопку, чтобы открыть Mini App.",
        reply_markup=main_keyboard(),
    )


async def main() -> None:
    log.info("starting bot, PREVIEW_URL=%s", PREVIEW_URL or "(unset)")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

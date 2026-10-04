"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { profileHome, profileIdentity, type Profile, useProfile } from "./profile-state";

const VIJAY_AVATAR = "/assets/vijay-saiwal.jpg";
const profiles: Profile[] = ["lead", "owner", "admin"];

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (profile === "admin") {
    return <Image src={VIJAY_AVATAR} alt="" width={size} height={size} className="shrink-0 rounded-[6px] object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[6px] bg-[#e8eefb] text-[11px] font-semibold text-[#1d449f]"
      style={{ width: size, height: size }}
    >
      {profileIdentity[profile].initials}
    </span>
  );
}

/** The account card at the bottom of the sidebar. Its menu switches between the profiles. */
export function AccountMenu() {
  const { profile, setProfile } = useProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = profileIdentity[profile];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: Profile) => {
    setOpen(false);
    setProfile(next);
    router.push(profileHome[next]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Profile menu"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        className="relative flex w-full items-center gap-[12px] rounded-[8px] bg-[#27272a] px-[8px] py-[8px] text-left"
      >
        <Avatar profile={profile} size={32} />
        <span className="flex min-w-px flex-1 flex-col justify-center gap-[2px]">
          <span className="truncate text-[14px] font-medium leading-[20px] text-[#f4f4f5]">{current.name}</span>
          <span className="flex w-fit items-center justify-center rounded-[4px] border-[0.5px] border-solid border-white/10 bg-[#3f3f46] px-[4.5px] py-[2.5px] text-[12px] font-medium leading-[1.1] text-[#d4d4d8]">
            {current.role}
          </span>
        </span>
        <img alt="" className="relative block size-[15px] shrink-0" src="/assets/figma/v2/imgTrianglesMini.svg" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 flex w-full flex-col overflow-hidden rounded-[8px] bg-white py-1 shadow-elevation-flyout"
        >
          <span className="px-3 pb-1 pt-2 text-[12px] font-medium text-[#71717a]">Switch profile</span>
          {profiles.map((option) => {
            const on = option === profile;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => choose(option)}
                className="flex items-center gap-[10px] px-3 py-2 text-left hover:bg-[#f4f4f5]"
              >
                <Avatar profile={option} size={28} />
                <span className="flex min-w-px flex-1 flex-col">
                  <span className="truncate text-[14px] font-medium leading-[20px] text-[#18181b]">{profileIdentity[option].name}</span>
                  <span className="text-[12px] leading-[16px] text-[#71717a]">{profileIdentity[option].role}</span>
                </span>
                {on ? <span className="text-[13px] text-[#2876f5]">✓</span> : null}
              </button>
            );
          })}
          <div className="my-1 border-t border-[#e4e4e7]" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-left text-[14px] leading-5 text-[#18181b] hover:bg-[#f4f4f5]"
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-left text-[14px] leading-5 text-[#18181b] hover:bg-[#f4f4f5]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Avatar, DropdownMenu } from "@medusajs/ui";
import { useRouter } from "next/navigation";

import { avatarUrl } from "@/config/people";

import { profileHome, profileIdentity, type Profile, useProfile } from "./profile-state";

const profiles: Profile[] = ["lead", "owner"];

/** The profile's picture: a generated avatar for the person, with their initials as the fallback. */
function ProfileAvatar({ profile, size }: { profile: Profile; size: "xsmall" | "small" }) {
  const identity = profileIdentity[profile];
  return <Avatar src={avatarUrl(identity.name)} fallback={identity.initials} size={size} variant="rounded" />;
}

/** The account card at the bottom of the sidebar. Its menu switches between the profiles. */
export function AccountMenu() {
  const { profile, setProfile } = useProfile();
  const router = useRouter();
  const current = profileIdentity[profile];

  const choose = (next: Profile) => {
    setProfile(next);
    router.push(profileHome[next]);
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Profile menu"
          className="relative flex w-full items-center gap-[12px] rounded-[8px] bg-[#27272a] px-[8px] py-[8px] text-left"
        >
          <ProfileAvatar profile={profile} size="small" />
          <span className="flex min-w-px flex-1 flex-col justify-center gap-[2px]">
            <span className="truncate text-[14px] font-medium leading-[20px] text-[#f4f4f5]">{current.name}</span>
            <span className="flex w-fit items-center justify-center rounded-[4px] border-[0.5px] border-solid border-white/10 bg-[#3f3f46] px-[4.5px] py-[2.5px] text-[12px] font-medium leading-[1.1] text-[#d4d4d8]">
              {current.role}
            </span>
          </span>
          <img alt="" className="relative block size-[15px] shrink-0" src="/assets/figma/v2/imgTrianglesMini.svg" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenu.Label>Switch profile</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={profile} onValueChange={(value) => choose(value as Profile)}>
          {profiles.map((option) => (
            <DropdownMenu.RadioItem key={option} value={option}>
              <ProfileAvatar profile={option} size="xsmall" />
              <span className="flex min-w-px flex-1 flex-col">
                <span className="truncate font-medium">{profileIdentity[option].name}</span>
                <span className="text-ui-fg-subtle">{profileIdentity[option].role}</span>
              </span>
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

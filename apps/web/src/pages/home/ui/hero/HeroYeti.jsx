import ledgeImage from "@/shared/assets/auth-scene/ledge.webp"
// The sky module directly (not the auth-scene barrel), so the home page
// does not load the sign-in layout's styles.
import AuthSky from "@/shared/ui/auth-scene/AuthSky"
import { YetiMascot } from "@/shared/ui/yeti-mascot"

// The Prahit yeti in the hero: standing on a grassy hill inside a round
// window of the sign-in pages' sky, so its white coat reads against the
// white page. Its crest and waving hand may cross the window's edge. It
// greets once per browser session, leans slightly toward the pointer and
// waves again when clicked or tapped. Decorative: hidden from assistive
// technology, and the hero's copy and links never depend on it.
export default function HeroYeti({ className = "" }) {
  return (
    <div className={`sn-hero-yeti ${className}`.trim()} aria-hidden="true">
      <div className="sn-hero-yeti-window">
        <AuthSky panel />
        <img className="sn-hero-yeti-ledge" src={ledgeImage} alt="" />
      </div>
      <YetiMascot
        className="sn-hero-yeti-stage"
        greet="session"
        lean
        interactive
        priority
      />
    </div>
  )
}

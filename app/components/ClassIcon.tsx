import type { ClassId } from "../game/mastery";
import warriorIcon from "../../Assets/warrior.svg";
import rangedIcon from "../../Assets/ranged.svg";
import tankIcon from "../../Assets/tank.svg";
import supportIcon from "../../Assets/support.svg";

const ICONS = {
  warrior: warriorIcon,
  ranged: rangedIcon,
  tank: tankIcon,
  support: supportIcon,
};

export function ClassIcon({ id }: { id: ClassId }) {
  return (
    <span className={`class-icon icon-${id}`} aria-hidden="true">
      <img src={ICONS[id]} alt="" />
    </span>
  );
}

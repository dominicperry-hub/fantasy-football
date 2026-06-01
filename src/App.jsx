import { useState } from "react";
import { darkTheme, lightTheme } from "./theme";
import Registry from "./Registry";
import Scoring from "./Scoring";

if (page === "registry") return <><div>{nav}</div><Registry theme={theme} /></>;
if (page === "scoring") return <><div>{nav}</div><Scoring theme={theme} /></>;

return null;

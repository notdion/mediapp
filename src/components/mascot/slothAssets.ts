import slothStanding from '../Sloth/Sloth - Standing.png';
import slothWaving from '../Sloth/Sloth - Waving.png';
import slothMeditating from '../Sloth/Sloth - Meditating.png';
import slothLaughing from '../Sloth/Sloth - Laughing.png';
import slothSleep from '../Sloth/Sloth - Sleep.png';
import slothSetup from '../Sloth/Sloth - Setup.png';
import slothListening from '../Sloth/Sloth - Listening.png';
import slothPosing from '../Sloth/Sloth - Posing.png';
import slothCongrats from '../Sloth/Sloth - Congrats.png';
import slothCongrats1 from '../Sloth/Sloth - Congrats(1).png';
import slothNotifications from '../Sloth/Sloth - Notifications.png';
import slothMail from '../Sloth/Sloth - Mail.png';
import slothHammock from '../Sloth/Sloth - Hammock.png';
import slothPhone from '../Sloth/Sloth - Phone.png';
import slothHumanCursor from '../Sloth/Sloth - Human Cursor.png';
import slothLanding from '../Sloth/Sloth - Landing.png';

export const slothImages = {
  standing: slothStanding,
  waving: slothWaving,
  meditating: slothMeditating,
  laughing: slothLaughing,
  sleeping: slothSleep,
  setup: slothSetup,
  listening: slothListening,
  posing: slothPosing,
  congrats: slothCongrats,
  congrats1: slothCongrats1,
  notifications: slothNotifications,
  mail: slothMail,
  hammock: slothHammock,
  phone: slothPhone,
  cursor: slothHumanCursor,
  landing: slothLanding,
} as const;

export const congratsImages = [slothCongrats, slothCongrats1] as const;

export const profileSlothImages = [slothStanding, slothMeditating, slothSleep] as const;

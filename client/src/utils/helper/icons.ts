// TODO: This is not good, should be dynamic...
import additionIcon from '../../../public/icons/addition.svg';
import commentInternalIcon from '../../../public/icons/commentInternal.svg';
import emphasisedIcon from '../../../public/icons/emphasised.svg';
import expansionIcon from '../../../public/icons/expansion.svg';
import nonLinearIcon from '../../../public/icons/nonLinear.svg';
import interventionIcon from '../../../public/icons/intervention.svg';
import correctionIcon from '../../../public/icons/correction.svg';
import deletedIcon from '../../../public/icons/deleted.svg';
import unclearIcon from '../../../public/icons/unclear.svg';
import repeatedIcon from '../../../public/icons/repeated.svg';
import gapIcon from '../../../public/icons/gap.svg';
import headIcon from '../../../public/icons/head.svg';
import lineIcon from '../../../public/icons/line.svg';
import paragraphIcon from '../../../public/icons/paragraph.svg';
import transpositionIcon from '../../../public/icons/transposition.svg';

const iconsMap: { [key: string]: string } = {
  addition: additionIcon,
  commentInternal: commentInternalIcon,
  emphasised: emphasisedIcon,
  expansion: expansionIcon,
  nonLinear: nonLinearIcon,
  intervention: interventionIcon,
  correction: correctionIcon,
  deleted: deletedIcon,
  unclear: unclearIcon,
  repeated: repeatedIcon,
  gap: gapIcon,
  head: headIcon,
  line: lineIcon,
  paragraph: paragraphIcon,
  transposition: transpositionIcon,
};

export default iconsMap;

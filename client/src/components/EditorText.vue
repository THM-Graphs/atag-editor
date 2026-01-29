<script setup lang="ts">
import {
  computed,
  ComputedRef,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useTemplateRef,
} from 'vue';
import { useCharactersStore } from '../store/characters';
import EditorTextNavigation from './EditorTextNavigation.vue';
import { Editor, EditorContent, Mark, mergeAttributes, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import {
  getCharacterUuidFromSpan,
  getParentCharacterSpan,
  getOuterRangeBoundaries,
  getSelectionData,
  isCaretAtBeginning,
  isCaretAtEnd,
  isEditorElement,
  removeFormatting,
  getSpansToAnnotate,
} from '../utils/helper/helper';
import ToggleSwitch from 'primevue/toggleswitch';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import TextOperationError from '../utils/errors/textOperation.error';
import { Annotation, AnnotationType, Character } from '../models/types';
import { useEventListener } from '@vueuse/core';
import { useAppStore } from '../store/app';
import { useAnnotationStore } from '../store/annotations';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { useGuidelinesStore } from '../store/guidelines';
import ShortcutError from '../utils/errors/shortcut.error';

const { asyncOperationRunning } = defineProps<{ asyncOperationRunning: boolean }>();

const CustomSpan = Mark.create({
  name: 'customSpan',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
      // Capture all data-* attributes dynamically
      dataAttributes: {
        default: {},
        parseHTML: element => {
          const dataAttrs = {};
          Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
              dataAttrs[attr.name] = attr.value;
            }
          });
          return dataAttrs;
        },
        renderHTML: attributes => {
          return attributes.dataAttributes || {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // console.log('Rendering:', HTMLAttributes);
    return [
      'span',
      {
        class: HTMLAttributes.class,
        ...HTMLAttributes.dataAttributes,
      },
      0,
    ];
  },
});

const r261 = `<div class="rendered-text-view"><span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0131" target="_blank">393ra</a> ]</span>   <span class="emphasis"> </span><span class="titulus emphasis">Quida</span><span class="expansion emphasis titulus">m</span><span class="emphasis titulus"> </span><span class="custom-entry person emphasis titulus" data-register-id="43783f3c-6e5e-429f-a1f7-ab3b84f8355f" data-register-type="person"> </span><span class="custom-entry person emphasis titulus" data-register-id="4f421e7f-bf7d-46b3-afc9-f545f5d0cd0f" data-register-type="person"> </span><span class="custom-entry person emphasis titulus" data-register-id="597f84df-3918-4b1f-8cfb-fd3dda992919" data-register-type="person"> </span><span class="custom-entry person emphasis titulus" data-register-id="0a00e35f-5992-4526-a234-6910ad2f07ba" data-register-type="person">sacerdo/tes</span><span class="emphasis titulus"> </span><span class="emphasis titulus"> </span><span class="emphasis titulus">.</span><span class="emphasis titulus"> </span><span class="custom-entry person emphasis titulus" data-register-id="4b2da373-4037-4198-92f4-606e74ef03f0" data-register-type="person">hildeg</span><span class="expansion emphasis titulus custom-entry person" data-register-id="4b2da373-4037-4198-92f4-606e74ef03f0" data-register-type="person">ardi</span><span class="emphasis titulus expansion"> </span><span class="emphasis titulus">.</span><span class="titulus"> </span> <span class="custom-entry person" data-register-id="5eff5de5-b78c-421a-b569-75e07498da04" data-register-type="person"> </span><span class="emphasis custom-entry person" data-register-id="5eff5de5-b78c-421a-b569-75e07498da04" data-register-type="person">H</span><span class="custom-entry person" data-register-id="5eff5de5-b78c-421a-b569-75e07498da04" data-register-type="person">ildigardi</span> magistrę / <span class="custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">de s</span><span class="expansion custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">an</span><span class="custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">c</span><span class="expansion custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">t</span><span class="custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">o Rob</span><span class="expansion custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">er</span><span class="custom-entry place" data-register-id="b47ce85b-46ec-452c-900f-6f9224f2a93e" data-register-type="place">to in pingis</span>. <span class="custom-entry person" data-register-id="52e15a92-b00e-4c88-ac09-a09c4b5b88cf" data-register-type="person">O.</span> <span class="custom-entry person" data-register-id="0e8cf7fa-64c2-4fd7-ab03-c634690617b1" data-register-type="person">C.</span> <span class="custom-entry person" data-register-id="1c7c3ccc-0d0a-4079-b3b8-47b5bb67195b" data-register-type="person">V.</span> / peccatores nominetenusq<span class="expansion">ue</span> sacerdotes. et / tota <span class="custom-entry person" data-register-id="726fa58f-0f5c-4529-b478-847459553a63" data-register-type="person">congregatio</span> fr<span class="expansion">atru</span>m in <span class="custom-entry place" data-register-id="41df4bd5-b4f6-4bde-ad0b-9815308bb946" data-register-type="place">Amerbach</span> de/gentiu<span class="expansion">m</span>! cu<span class="expansion">m</span> fulgentissima lampade. ad / et<span class="expansion">er</span>nas nuptias intrare. Lux uiuens om/nis boni op<span class="expansion">er</span>atrix. cui om<span class="expansion">n</span>is anima ui/talis et ad decimu<span class="expansion">m</span> numeru<span class="expansion">m</span> p<span class="expansion">re</span>electa sit / coop<span class="expansion">er</span>atrix. etsi eade<span class="expansion">m</span> in sua puritate in/ueniat<span class="expansion">ur</span>. tam<span class="expansion">en</span> iuxta sensu<span class="expansion">m</span> accipientiu<span class="expansion">m</span> a / beatis different<span class="expansion">er</span> participat<span class="expansion">ur</span>. Nam sicut / illa sup<span class="expansion">re</span>ma regalis aulę organa eo arden/tius i<span class="expansion">n</span>fla<span class="expansion">m</span>mantur. quo uicini<span class="expansion">us</span> et quasi in / medietate fonte<span class="expansion">m</span> claritatis contemplan/tur. i<span class="expansion">n</span>feriora u<span class="expansion">er</span>o ang<span class="expansion">e</span>lor<span class="expansion">um</span> agmina quanto / ab ipsa origine sunt remotiora. tanto / differenti<span class="expansion">us</span>. tanto debilius. ab illo princi/pali lumine reluce<span class="expansion">n</span>t. sic et sp<span class="expansion">iritu</span>s i<span class="expansion">n</span>corp<span class="expansion">or</span>ati / licet ad uita<span class="expansion">m</span> sint p<span class="expansion">re</span>ordinati. alij habun/danti<span class="expansion">us</span>. alij tenui<span class="expansion">us</span>. impetu claritatis a / maiestate semp<span class="expansion">er</span> discurrentes irradiant<span class="expansion">ur</span>. / et ad illud beatificu<span class="expansion">m</span> principiu<span class="expansion">m</span> conseq<span class="expansion">ue</span>n/du<span class="expansion">m</span> distantissima mobilitate eleuant<span class="expansion">ur</span>. / Su<span class="expansion">n</span>t eni<span class="expansion">m</span> quęda<span class="expansion">m</span> animę in illud pelag<span class="expansion">us</span> / claritatis sic <span class="">absortę</span>. ut aliud nichil / uidere. aliud nichil sentire qua<span class="expansion">m</span> p<span class="expansion">re</span>sentia<span class="expansion">m</span> / illi<span class="expansion">us</span> luminis om<span class="expansion">n</span>ia uiuificantis sibi ui/deant<span class="expansion">ur</span>. Quaru<span class="expansion">m</span> fulgore et cet<span class="expansion">er</span>ę animę ad/huc t<span class="expansion">er</span>restri graues obscuritate. du<span class="expansion">m</span> sepi<span class="expansion">us</span> / reuerberantur. ad receptaculu<span class="expansion">m</span> ipsi<span class="expansion">us</span> clari/tatis aptificant<span class="expansion">ur</span>. quo sibi ex ea subtili<span class="expansion">us</span> / notificant<span class="expansion">ur</span>. Quia <span class="expansion">er</span>go tu mat<span class="expansion">er</span> reuerentis/sima ad claritate<span class="expansion">m</span> illa<span class="expansion">m</span> uicini<span class="expansion">us</span> ascendis/ti. splendor a corde tuo eru<span class="expansion">m</span>pens consci/  entias n<span class="expansion">ost</span>ras illuminet! ita ut p<span class="expansion">er</span> radios / tu<span class="expansion">m</span> ammonitionis. tu<span class="expansion">m</span> exhortationis. tu<span class="expansion">m</span> / correptionis tenebrę n<span class="expansion">ost</span>rę i<span class="expansion">m</span>minuantur. / Nam quia habundauit i<span class="expansion">n</span>iquitas et re/friguit caritas p<span class="expansion">er</span> scisma romanu<span class="expansion">m</span> tene/bras erroris patimur. et q<span class="expansion">uonia</span>m nubib<span class="expansion">us</span> i<span class="expansion">n</span>i/quitatis obstantib<span class="expansion">us</span> sol iusticię obscura/tus e<span class="expansion">st</span>. luna quę e<span class="expansion">st</span> ęccl<span class="expansion">es</span>ia ab ordine religi/onis multimodis exorbitauit. Veru<span class="expansion">m</span>ta/men quia uerba chr<span class="expansion">ist</span>i n<span class="expansion">on</span> transeu<span class="expansion">n</span>t. si per/mane<span class="expansion">n</span>t. et ide<span class="expansion">m</span> ipse testat<span class="expansion">ur</span>. ecce ego uobis/cu<span class="expansion">m</span> su<span class="expansion">m</span> usq<span class="expansion">ue</span> ad consu<span class="expansion">m</span>matione<span class="expansion">m</span> s<span class="expansion">e</span>c<span class="expansion">u</span>li. qua<span class="expansion">m</span>uis / totus iam pene orbis tenebris erroris / i<span class="expansion">n</span>uolutus sit. radius quida<span class="expansion">m</span> antiquę / gr<span class="expansion">ati</span>ę ne tota gens p<span class="expansion">er</span>eat. in uobis resplen/duit. Ordo eni<span class="expansion">m</span> monachor<span class="expansion">um</span> orbitat. or/do clericor<span class="expansion">um</span> claudicat. ordo quoq<span class="expansion">ue</span> s<span class="expansion">an</span>c<span class="expansion">t</span>imo/nialiu<span class="expansion">m</span> titubat! et cu<span class="expansion">m</span> sp<span class="expansion">ir</span>itales religione / hoc mo<span class="expansion">do</span> excedu<span class="expansion">n</span>t. s<span class="expansion">e</span>c<span class="expansion">u</span>lares i<span class="expansion">n</span>stituta<span class="expansion">m</span> sibi a d<span class="expansion">omi</span>no / lege<span class="expansion">m</span> om<span class="expansion">n</span>ino negligu<span class="expansion">n</span>t. Nam int<span class="expansion">er</span> cet<span class="expansion">er</span>a faci/nora quib<span class="expansion">us</span> d<span class="expansion">eu</span>m obliuioni tradu<span class="expansion">n</span>t. legitima / coniugia <span class="sic" data-sictext="derelinqunt" data-sictype="emendatio" data-siccorrected="derelinquunt">derelinqunt</span>. et aliena p<span class="expansion">ro</span> libitu / suo sibi copulant. homicidia p<span class="expansion">er</span>petrant. / et i<span class="expansion">n</span>de magnos se fore existima<span class="expansion">n</span>t. ac q<span class="expansion">u</span>isq<span class="expansion">ue</span> / uelut i<span class="expansion">n</span>erte<span class="expansion">m</span> se e<span class="expansion">ss</span>e dicit si his maculis i<span class="expansion">m</span>mu/nis i<span class="expansion">n</span>uenit<span class="expansion">ur</span>. Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> sacerdotes qui clama/re et ueritate<span class="expansion">m</span> cu<span class="expansion">m</span> correptione loqui debe/rent. iam silere cogunt<span class="expansion">ur</span>. N<span class="expansion">un</span>c tu o mat<span class="expansion">er</span> ue/neranda. q<span class="expansion">uonia</span>m ut in scripturis tuis legi/mus co<span class="expansion">m</span>monitiones sp<span class="expansion">ir</span>italib<span class="expansion">us</span> multociens / direxisti eas etia<span class="expansion">m</span> s<span class="expansion">e</span>c<span class="expansion">u</span>larib<span class="expansion">us</span> qua<span class="expansion">m</span> intime ro/gamus ut dirigas. quia necesse e<span class="expansion">st</span> ut / duris et crebris correptionib<span class="expansion">us</span> i<span class="expansion">n</span>clament<span class="expansion">ur</span>. / qui correptiones aliquas uix sustinere / dignant<span class="expansion">ur</span>. Speram<span class="expansion">us</span> eni<span class="expansion">m</span> q<span class="expansion">uo</span>d animos suos / uerbis tuis adtenti<span class="expansion">us</span> i<span class="expansion">n</span>cline<span class="expansion">n</span>t. q<span class="expansion">uonia</span>m p<span class="expansion">er</span> diui/na<span class="expansion">m</span> uisione<span class="expansion">m</span> et iussione<span class="expansion">m</span> te loqui credunt / et sciu<span class="expansion">n</span>t! qua<span class="expansion">m</span> uerbis n<span class="expansion">ost</span>ris quos in multis / t<span class="expansion">r</span>ansgressionib<span class="expansion">us</span> uacillare uide<span class="expansion">n</span>t. Vale. /  </div>`;
const r262 = `<span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0131" target="_blank">393rb</a> ]</span>  <span class="emphasis"> </span><span class="titulus emphasis">Ad s</span><span class="expansion emphasis titulus">e</span><span class="emphasis titulus">c</span><span class="expansion emphasis titulus">u</span><span class="emphasis titulus">lares </span><span class="custom-entry person emphasis titulus" data-register-id="28ed061f-bf46-4781-ae4e-5cbe73ef2081" data-register-type="person">ho</span><span class="expansion emphasis titulus custom-entry person" data-register-id="28ed061f-bf46-4781-ae4e-5cbe73ef2081" data-register-type="person">m</span><span class="emphasis titulus custom-entry person" data-register-id="28ed061f-bf46-4781-ae4e-5cbe73ef2081" data-register-type="person">i</span><span class="expansion emphasis titulus custom-entry person" data-register-id="28ed061f-bf46-4781-ae4e-5cbe73ef2081" data-register-type="person">n</span><span class="emphasis titulus custom-entry person" data-register-id="28ed061f-bf46-4781-ae4e-5cbe73ef2081" data-register-type="person">es</span><span class="emphasis titulus"> diu</span><span class="expansion emphasis titulus">er</span><span class="emphasis titulus">sor</span><span class="expansion emphasis titulus">um</span><span class="emphasis titulus"> p</span><span class="expansion emphasis titulus">o</span><span class="emphasis titulus">p</span><span class="expansion emphasis titulus">u</span><span class="emphasis titulus">lor</span><span class="expansion emphasis titulus">um</span><span class="emphasis titulus"> </span><span class="custom-entry person emphasis titulus" data-register-id="5ad38e34-9e12-4970-96fc-1ea488188892" data-register-type="person">h</span><span class="expansion emphasis titulus custom-entry person" data-register-id="5ad38e34-9e12-4970-96fc-1ea488188892" data-register-type="person">ildegardis</span><span class="emphasis titulus expansion"> </span><span class="emphasis titulus">.</span><span class="titulus"> </span>  <span class="emphasis">O</span> turbę hominu<span class="expansion">m</span> / nascentiu<span class="expansion">m</span> et crescentiu<span class="expansion">m</span> p<span class="expansion">er</span> diuina<span class="expansion">m</span> / sapientia<span class="expansion">m</span>. audite q<span class="expansion">uo</span>d ego serena lux et / factor om<span class="expansion">n</span>iu<span class="expansion">m</span> uobis dico. U<span class="expansion">est</span>ra plantatio / fuit in corde meo. in originali die o<span class="expansion">mn</span>is  / <span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0132" target="_blank">393v</a> ]</span>creaturę. Et cu<span class="expansion">m</span> creaui homine<span class="expansion">m</span>! feci / ei i<span class="expansion">n</span>strum<span class="expansion">en</span>tu<span class="expansion">m</span> q<span class="expansion">uo</span>d <span class="custom-entry person" data-register-id="63fac49d-60e7-451e-9139-e461252755e2" data-register-type="person">diabolus</span> derisit. Hoc / e<span class="expansion">st</span>. Lege<span class="expansion">m</span> dedi ei q<span class="expansion">u</span>a<span class="expansion">m</span><span class="strikedOut">d</span> <span class="custom-entry person" data-register-id="d1f264cd-f91e-455e-8489-c4a613e19f04" data-register-type="person">diabolus</span> p<span class="expansion">er</span> malu<span class="expansion">m</span> suu<span class="expansion">m</span> / deiecit! q<span class="expansion">uo</span>d malu<span class="expansion">m</span> n<span class="expansion">on</span> e<span class="expansion">st</span> meu<span class="expansion">m</span> qui su<span class="expansion">m</span> plenu<span class="expansion">m</span> / et potentissimu<span class="expansion">m</span> et acutissimu<span class="expansion">m</span> bonu<span class="expansion">m</span>. S<span class="expansion">ed</span> / d<span class="expansion">eu</span>m decuit ut p<span class="expansion">er</span> semetipsu<span class="expansion">m</span> tale et ta<span class="expansion">m</span> mag/nu<span class="expansion">m</span> opus faceret. q<span class="expansion">uo</span>d multa et diuersa o/p<span class="expansion">er</span>a op<span class="expansion">er</span>ari posset! q<span class="expansion">u</span>od homo e<span class="expansion">st</span>. Deus enim / n<span class="expansion">on</span> est factus nec creatus nec uicissitudine / te<span class="expansion">m</span>por<span class="expansion">um</span> tactus. s<span class="expansion">ed</span> semp<span class="expansion">er</span> e<span class="expansion">ss</span>e habet. q<span class="expansion">u</span>od rota / nec i<span class="expansion">n</span>iciu<span class="expansion">m</span> nec fine<span class="expansion">m</span> habens designat. Ipse / etia<span class="expansion">m</span> nullu<span class="expansion">m</span> defectu<span class="expansion">m</span> habet. s<span class="expansion">ed</span> om<span class="expansion">n</span>ia uiuen/tia de dispositione ipsi<span class="expansion">us</span> p<span class="expansion">ro</span>cedu<span class="expansion">n</span>t! et ipse / morte<span class="expansion">m</span> sup<span class="expansion">er</span>auit. Quomo<span class="expansion">do</span>? Audi o homo. / Malu<span class="expansion">m</span> cecidit fortissima ui diuinitatis / quę nu<span class="expansion">m</span>qua<span class="expansion">m</span> uiuere i<span class="expansion">n</span>cepit! s<span class="expansion">ed</span> quę semp<span class="expansion">er</span> / uiuit. Cu<span class="expansion">m</span> eni<span class="expansion">m</span> uiuens spera sensit quia / a deo facta et creata fuit malu<span class="expansion">m</span> arripuit. / q<span class="expansion">uo</span>d deus qui e<span class="expansion">st</span> i<span class="expansion">n</span>teger destruxit. quia ma/lu<span class="expansion">m</span> tanta<span class="expansion">m</span> fortitudine<span class="expansion">m</span> habet. q<span class="expansion">u</span>od n<span class="expansion">on</span> dece/ret. ut ullus illud sup<span class="expansion">er</span>aret nisi iste qui / sine i<span class="expansion">n</span>icio e<span class="expansion">st</span>. Ipse etia<span class="expansion">m</span> malu<span class="expansion">m</span> p<span class="expansion">er</span> humerum / suu<span class="expansion">m</span> sup<span class="expansion">er</span>auit. Quomo<span class="expansion">do</span>? P<span class="expansion">er</span> homine<span class="expansion">m</span>. Quid / e<span class="expansion">st</span> hoc? Homine<span class="expansion">m</span> misit in anima et cor/p<span class="expansion">or</span>e. In utroq<span class="expansion">ue</span> magnu<span class="expansion">m</span> misteriu<span class="expansion">m</span> latuit. / Nam uirginitas homine<span class="expansion">m</span> scilicet maxi/mu<span class="expansion">m</span> et p<span class="expansion">re</span>ciosissimu<span class="expansion">m</span> donu<span class="expansion">m</span> in su<span class="expansion">m</span>mo sacerdo/te eduxit! p<span class="expansion">er</span> que<span class="expansion">m</span> d<span class="expansion">eu</span>s hoc malu<span class="expansion">m</span> plenit<span class="expansion">er</span> de/<span class="correction" data-correction="correxit"> <span class="correction" data-correction="correxit"> s</span> </span>truxit. O pulcherrimę formę homi/nu<span class="expansion">m</span> quare in negligentia dormitis! cu<span class="expansion">m</span> / uos in magna gl<span class="expansion">ori</span>a deus constituerit? / Deus maxima<span class="expansion">m</span> lege<span class="expansion">m</span> uobis dedit! cu<span class="expansion">m</span> ho/mine<span class="expansion">m</span> in paradysu<span class="expansion">m</span> posuit. Et eode<span class="expansion">m</span> amo/re ipsu<span class="expansion">m</span> fecit. quo filiu<span class="expansion">m</span> suu<span class="expansion">m</span> homine<span class="expansion">m</span> fie/ri uoluit. ut malu<span class="expansion">m</span> illud sup<span class="expansion">er</span>aret q<span class="expansion">u</span>od se / cont<span class="expansion">r</span>a eu<span class="expansion">m</span> erexerat. Sic deus uoluit malu<span class="expansion">m</span> / sup<span class="expansion">er</span>are p<span class="expansion">er</span> suauissima<span class="expansion">m</span> corp<span class="expansion">or</span>ale<span class="expansion">m</span> forma<span class="expansion">m</span> ho/minis. in quo diabolus estimauit uicto/ria<span class="expansion">m</span> sua<span class="expansion">m</span> habere. un<span class="expansion">de</span> etia<span class="expansion">m</span> i<span class="expansion">n</span>cepit illi te<span class="expansion">m</span>p/tationib<span class="expansion">us</span> suis illudere! ignorans quia / p<span class="expansion">er</span> illu<span class="expansion">m</span> totus sup<span class="expansion">er</span>aret<span class="expansion">ur</span>. Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> o homines / n<span class="expansion">on</span> fatigemini in stulticia moru<span class="expansion">m</span> u<span class="expansion">est</span>ror<span class="expansion">um</span>! / quasi lege<span class="expansion">m</span> n<span class="expansion">on</span> habeatis. Q<span class="expansion">uo</span>d n<span class="expansion">on</span> est. Nam / ego legem uobis posui. ut n<span class="expansion">on</span> comedere tis cibu<span class="expansion">m</span> sensibilis mali. s<span class="expansion">ed</span> uos p<span class="expansion">re</span>ceptu<span class="expansion">m</span> / meu<span class="expansion">m</span> t<span class="expansion">r</span>ansgressi estis et scientia<span class="expansion">m</span> illa<span class="expansion">m</span> quę / uos in p<span class="expansion">er</span>egrinatione<span class="expansion">m</span> expulit appetijstis. / S<span class="expansion">ed</span> tu o homo dicis. Quare malu<span class="expansion">m</span> scio? / In hoc cont<span class="expansion">r</span>adicis mi<span class="expansion">hi</span> creatori. sic<span class="expansion">ut</span> et ille / qui me uoluit sup<span class="expansion">er</span>are. S<span class="expansion">ed</span> ego nolo ma/lu<span class="expansion">m</span>! nec illud secreta mea tangit. In ip/so aut<span class="expansion">em</span> oculi u<span class="expansion">est</span>ri obtenebrati su<span class="expansion">n</span>t. Et / cu<span class="expansion">m</span> malu<span class="expansion">m</span> scitis. cur illud facitis? Quomo<span class="expansion">do</span> / aut<span class="expansion">em</span> posset creatura mea e<span class="expansion">ss</span>e uacua! sine / utilitate? Vnaquęq<span class="expansion">ue</span> eni<span class="expansion">m</span> creatura quę / n<span class="expansion">on</span> uiuit in racionalitate aut in sensibi/litate habet in se duo utilia! et unu<span class="expansion">m</span> q<span class="expansion">uo</span>d / p<span class="expansion">er</span>it. Duo. scilicet alt<span class="expansion">er</span>um in pinguedine / formę. et alteru<span class="expansion">m</span> in ei<span class="expansion">us</span> uiriditate! et / unu<span class="expansion">m</span> q<span class="expansion">uo</span>d p<span class="expansion">er</span>it in ariditate. Sic etia<span class="expansion">m</span> ho/mo habet duo in se. uidelicet anima<span class="expansion">m</span> / et corpus. anima<span class="expansion">m</span> in uirtutib<span class="expansion">us</span>. corp<span class="expansion">us</span> / in op<span class="expansion">er</span>atione. sciens etia<span class="expansion">m</span> malu<span class="expansion">m</span> q<span class="expansion">uo</span>d e<span class="expansion">st</span> ue/lut illud q<span class="expansion">uo</span>d p<span class="expansion">er</span>it aridu<span class="expansion">m</span>. Alioquin fa/ctura n<span class="expansion">on</span> e<span class="expansion">ss</span>et. Nam cu<span class="expansion">m</span> <span class="custom-entry person" data-register-id="ec53ccb9-7ef8-4293-b2b0-4c5e151c52d0" data-register-type="person">ada</span><span class="expansion custom-entry person" data-register-id="ec53ccb9-7ef8-4293-b2b0-4c5e151c52d0" data-register-type="person">m</span><span class="expansion"> </span> p<span class="expansion">re</span>ceptu<span class="expansion">m</span> acce/pit. sciebat illud q<span class="expansion">u</span>od me n<span class="expansion">on</span> tetigit. et / q<span class="expansion">uo</span>d mi<span class="expansion">hi</span> contrariu<span class="expansion">m</span> et cont<span class="expansion">r</span>a meu<span class="expansion">m</span> p<span class="expansion">re</span>ceptu<span class="expansion">m</span> / fuit e<span class="expansion">ss</span>e negligendu<span class="expansion">m</span>. S<span class="expansion">ed</span> cu<span class="expansion">m</span> illud concu/piuit habere. sciebat quide<span class="expansion">m</span> illud uelut / in optione. s<span class="expansion">ed</span> n<span class="expansion">on</span>du<span class="expansion">m</span> in op<span class="expansion">er</span>atione. sicut / et celestes ang<span class="expansion">e</span>li malu<span class="expansion">m</span> e<span class="expansion">ss</span>e sciu<span class="expansion">n</span>t. s<span class="expansion">ed</span> illud / n<span class="expansion">on</span> faciu<span class="expansion">n</span>t. Cu<span class="expansion">m</span> <span class="custom-entry person" data-register-id="8f1fb31e-6c1b-4f81-9bf8-a299e9dc9fec" data-register-type="person">ada</span><span class="expansion custom-entry person" data-register-id="8f1fb31e-6c1b-4f81-9bf8-a299e9dc9fec" data-register-type="person">m</span><span class="expansion"> </span> malu<span class="expansion">m</span> fecit in op<span class="expansion">er</span>e. sci/uit illud sensibilit<span class="expansion">er</span>. et illud p<span class="expansion">er</span>fecit in / gustu culpabilit<span class="expansion">er</span> un<span class="expansion">de</span> in morte<span class="expansion">m</span> cecidit / qua<span class="expansion">m</span> ille i<span class="expansion">n</span>uenit qui se mi<span class="expansion">hi</span> primu<span class="expansion">m</span> op/posuit! quap<span class="expansion">ro</span>pt<span class="expansion">er</span> et de celestib<span class="expansion">us</span> in abiec/tione<span class="expansion">m</span> corruit. S<span class="expansion">ed</span> tu o homo nescis in / hoc quid dicis. Fallax eni<span class="expansion">m</span> deceptor de/cipit te. docens te cont<span class="expansion">r</span>aria. Cu<span class="expansion">m</span> dedi / uobis lege<span class="expansion">m</span> n<span class="expansion">on</span> p<span class="expansion">re</span>cepi ut faceretis fornica/tiones. adult<span class="expansion">er</span>ia. homicidia. rapinas. / i<span class="expansion">n</span>carcerationes nec ut que<span class="expansion">m</span>qua<span class="expansion">m</span> i<span class="expansion">n</span>carcerare/tis que<span class="expansion">m</span> n<span class="expansion">on</span> fecistis sed iussi ut multiplica/remini in filijs u<span class="expansion">est</span>ris p<span class="expansion">er</span> recta<span class="expansion">m</span> i<span class="expansion">n</span>stitutione<span class="expansion">m</span> / et n<span class="expansion">on</span> p<span class="expansion">er</span> libidine<span class="expansion">m</span>. et ut possideretis terra<span class="expansion">m</span>. / in labore colentes eam in frum<span class="expansion">en</span>to et / uino. et in alijs necessitatib<span class="expansion">us</span> quę ad ne/cessitate<span class="expansion">m</span> u<span class="expansion">est</span>ram p<span class="expansion">er</span>tinent. Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> debe/ <span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0133" target="_blank">394r</a> ]</span>  tis lege<span class="expansion">m</span> mea<span class="expansion">m</span> seruare. et n<span class="expansion">on</span> destruere. Na<span class="expansion">m</span> / p<span class="expansion">re</span>cepi uobis ut in recto amore et n<span class="expansion">on</span> in ue/nenoso adult<span class="expansion">er</span>io filios amaretis! s<span class="expansion">ed</span> uos faci/tis quasi liberi sitis p<span class="expansion">er</span>ficere quęcu<span class="expansion">m</span>q<span class="expansion">ue</span> uol/ueritis. et exercere om<span class="expansion">n</span>e malu<span class="expansion">m</span> q<span class="expansion">uo</span>d p<span class="expansion">er</span>petra/re potestis. Quare <span class="expansion">er</span>go p<span class="expansion">ro</span>icitis a uobis liga/tura<span class="expansion">m</span> legis u<span class="expansion">est</span>rę dicentes. n<span class="expansion">on</span> e<span class="expansion">st</span> nobis i<span class="expansion">n</span>stitu/tu<span class="expansion">m</span> ut habeamus et exerceam<span class="expansion">us</span> constricti/one<span class="expansion">m</span> disciplinę quasi celestes sim<span class="expansion">us</span>? S<span class="expansion">e</span>c<span class="expansion">u</span>l<span class="expansion">u</span>m / eni<span class="expansion">m</span> n<span class="expansion">on</span> p<span class="expansion">er</span>mittit nos celestes e<span class="expansion">ss</span>e. et etia<span class="expansion">m</span> filij / n<span class="expansion">ost</span>ri. et agri. oues. et boues. et alia pecora / n<span class="expansion">ost</span>ra et cet<span class="expansion">er</span>a om<span class="expansion">n</span>ia quęcu<span class="expansion">m</span>q<span class="expansion">ue</span> possidemus. / ab hac i<span class="expansion">n</span>tentione impediunt nos. Hęc / om<span class="expansion">n</span>ia dedit nobis d<span class="expansion">eu</span>s. Quare <span class="expansion">er</span>go obliuis/cimini illi<span class="expansion">us</span> qui uos creauit! et qui hec / om<span class="expansion">n</span>ia uobis dedit? Cu<span class="expansion">m</span> ipse uobis necessa/ria dat. int<span class="expansion">er</span>du<span class="expansion">m</span> uobis ea dimittit. et in/t<span class="expansion">er</span>du<span class="expansion">m</span> ea aufert. S<span class="expansion">ed</span> uos dicitis. Non e<span class="expansion">st</span> n<span class="expansion">ost</span>r<span class="expansion">u</span>m / ut bona<span class="expansion">m</span> et constricta<span class="expansion">m</span> uita<span class="expansion">m</span> habeamus. / s<span class="expansion">ed</span> e<span class="expansion">st</span> clericor<span class="expansion">um</span> et alior<span class="expansion">um</span> sp<span class="expansion">ir</span>italiu<span class="expansion">m</span> hominu<span class="expansion">m</span>. / Ergo audite! qui n<span class="expansion">on</span> estis solliciti in his / causis u<span class="expansion">est</span>ris. Uos magis om<span class="expansion">n</span>ib<span class="expansion">us</span> istis sp<span class="expansion">ir</span>ita/lib<span class="expansion">us</span> ligati estis. cu<span class="expansion">m</span> d<span class="expansion">eu</span>s p<span class="expansion">re</span>cepit uobis ut / sic uiuatis quomo<span class="expansion">do</span> uobis p<span class="expansion">re</span>dictu<span class="expansion">m</span> e<span class="expansion">st</span>. Nam / sp<span class="expansion">ir</span>itales homines recusant habere lege<span class="expansion">m</span> / hanc. quę uobis i<span class="expansion">n</span>iuncta e<span class="expansion">st</span>. Vn<span class="expansion">de</span> liberi s<span class="expansion">unt</span>. / quia ligatura legis u<span class="expansion">est</span>rę quę uobis speci/alit<span class="expansion">er</span> i<span class="expansion">m</span>posita e<span class="expansion">st</span> ipsos n<span class="expansion">on</span> constringit. S<span class="expansion">ed</span> ipsi / osculant<span class="expansion">ur</span> me in amplexib<span class="expansion">us</span> caritatis. / quando s<span class="expansion">e</span>c<span class="expansion">u</span>l<span class="expansion">u</span>m p<span class="expansion">ro</span>pt<span class="expansion">er</span> me relinqu<span class="expansion">u</span>nt supra / monte<span class="expansion">m</span> s<span class="expansion">an</span>c<span class="expansion">t</span>ificationis ascendentes. et sic ca/ri filij eru<span class="expansion">n</span>t. Uos aut<span class="expansion">em</span> quasi serui estis / p<span class="expansion">er</span> ligatura<span class="expansion">m</span> legis u<span class="expansion">est</span>rę uobis specialit<span class="expansion">er</span> im/positę. Nunc <span class="expansion">er</span>go i<span class="expansion">n</span>telligite me et lege<span class="expansion">m</span> ues/tra<span class="expansion">m</span> seruate! ne cu<span class="expansion">m</span> d<span class="expansion">omi</span>n<span class="expansion">u</span>s u<span class="expansion">este</span>r uenerit con/scientia u<span class="expansion">est</span>ra accuset uos quia p<span class="expansion">re</span>cepta ip/si<span class="expansion">us</span> destruxeritis q<span class="expansion">uonia</span>m in magna dilectio/ne habiti estis. cu<span class="expansion">m</span> p<span class="expansion">ro</span>pt<span class="expansion">er</span> crimina u<span class="expansion">est</span>ra i<span class="expansion">n</span>no/cens agnus in torcular crucis posit<span class="expansion">us</span> e<span class="expansion">st</span>. / Ergo o filij cari p<span class="expansion">ro</span>pt<span class="expansion">er</span> dilectissima<span class="expansion">m</span> forma/tione<span class="expansion">m</span> u<span class="expansion">est</span>ram! audite et i<span class="expansion">n</span>telligite me. S<span class="expansion">ed</span> / et o turba quid i<span class="expansion">n</span>sanis. quę p<span class="expansion">er</span> rabie<span class="expansion">m</span> furoris / tui me conte<span class="expansion">m</span>pnis? Quid facis in tam cri/minosis criminib<span class="expansion">us</span> p<span class="expansion">er</span> destructione<span class="expansion">m</span> car nis. ut homine<span class="expansion">m</span> simile<span class="expansion">m</span> tibi occidas? Hoc / malu<span class="expansion">m</span> estimatio primi p<span class="expansion">er</span>diti ang<span class="expansion">e</span>li i<span class="expansion">n</span>uenit. / qui me destruere uoluit. s<span class="expansion">ed</span> hoc n<span class="expansion">on</span> potu/it e<span class="expansion">ss</span>e q<span class="expansion">uo</span>d ille sic posse fieri estimabat. un<span class="expansion">de</span> / et ob sup<span class="expansion">er</span>bia<span class="expansion">m</span> sua<span class="expansion">m</span> in p<span class="expansion">er</span>ditione<span class="expansion">m</span> iuit. S<span class="expansion">ed</span> quia / <span class="custom-entry person" data-register-id="303345ba-c9f4-48dd-babb-49a683cd8279" data-register-type="person">ada</span><span class="expansion custom-entry person" data-register-id="303345ba-c9f4-48dd-babb-49a683cd8279" data-register-type="person">m</span><span class="expansion"> </span> me cognouit et amauit. et p<span class="expansion">re</span>cepta / mea in uoluntate sua osculatus e<span class="expansion">st</span>. ea uo/luit obseruare. nisi q<span class="expansion">uo</span>d diabolus eu<span class="expansion">m</span> ad in/obedientia<span class="expansion">m</span> p<span class="expansion">er</span>duxit. id<span class="expansion">e</span>o oportuit ut illu<span class="expansion">m</span> / de pena mortis liberare<span class="expansion">m</span>. q<span class="expansion">uonia</span>m pessimus / deceptor eu<span class="expansion">m</span> decep<span class="expansion">er</span>at. Nam ide<span class="expansion">m</span> <span class="custom-entry person" data-register-id="6a86c901-37fb-4aba-87d0-a4b71f0975e7" data-register-type="person">diabolus</span> / in om<span class="expansion">n</span>ib<span class="expansion">us</span> his nullu<span class="expansion">m</span> bonu<span class="expansion">m</span> gustauit. s<span class="expansion">ed</span> in / <span class="sic" data-sictext="peruersu" data-sictype="conjectura" data-siccorrected="peruerso">p</span><span class="expansion sic" data-sictext="peruersu" data-sictype="conjectura" data-siccorrected="peruerso">er</span><span class="sic" data-sictext="peruersu" data-sictype="conjectura" data-siccorrected="peruerso">uersu</span> uisu sup<span class="expansion">er</span>bię ad aquilone<span class="expansion">m</span> aspexit. / quia in om<span class="expansion">n</span>ib<span class="expansion">us</span> alijs lat<span class="expansion">er</span>ib<span class="expansion">us</span> sup<span class="expansion">er</span>ioru<span class="expansion">m</span> dispo/sitionu<span class="expansion">m</span> me ext<span class="expansion">er</span>ius i<span class="expansion">n</span>spiciens cu<span class="expansion">m</span> i<span class="expansion">n</span>dignatio/ne dubitabat me e<span class="expansion">ss</span>e in aquilone. q<span class="expansion">uonia</span>m ibi / potestate<span class="expansion">m</span> mea<span class="expansion">m</span> quasi ala<span class="expansion">m</span> in turbine obtexe/ra<span class="expansion">m</span>. hoc p<span class="expansion">re</span>significans q<span class="expansion">uo</span>d eade<span class="expansion">m</span> potestas mea / debuit malu<span class="expansion">m</span> istud deicere. q<span class="expansion">uo</span>d ille cogita/bat p<span class="expansion">er</span>ficere. Sic et ide<span class="expansion">m</span> in hac p<span class="expansion">er</span>uersa uolun/tate sua deiectus e<span class="expansion">st</span>. Tunc tu o malu<span class="expansion">m</span> homi/cidij p<span class="expansion">er</span>tinacit<span class="expansion">er</span> efferbuisti. illo c<span class="expansion">on</span>siliante. / Cu<span class="expansion">m</span> <span class="custom-entry person" data-register-id="2d16ead8-84ad-4108-9830-def91f2861fd" data-register-type="person">diabolus</span> homine<span class="expansion">m</span> creatu<span class="expansion">m</span> uidit. cepit / excribrare om<span class="expansion">n</span>e malu<span class="expansion">m</span> suu<span class="expansion">m</span>. homini blan/de i<span class="expansion">n</span>obedientia<span class="expansion">m</span> quasi p<span class="expansion">er</span> opinione<span class="expansion">m</span> p<span class="expansion">er</span>suasit. / q<span class="expansion">uonia</span>m n<span class="expansion">on</span> uidit in illo tanta<span class="expansion">m</span> malicia<span class="expansion">m</span> q<span class="expansion">u</span>anta<span class="expansion">m</span> / in se. un<span class="expansion">de</span> cepit illu<span class="expansion">m</span> dolose tangere et / ducere quasi ad utile<span class="expansion">m</span> honore<span class="expansion">m</span> ut ipsi con/sentiret. Et sic homo consensit diabolo. / Tunc diabolus gauisus e<span class="expansion">st</span> in seme<span class="correction" data-correction="correxit">t</span>ipso q<span class="expansion">uo</span>d / homine<span class="expansion">m</span> sup<span class="expansion">er</span>auerat. quia homo fecit q<span class="expansion">uo</span>d / ille uoluit. S<span class="expansion">ed</span> in homine tantu<span class="expansion">m</span> malum / n<span class="expansion">on</span> erat quantu<span class="expansion">m</span> in diabolo. q<span class="expansion">uonia</span>m diabolus / deo i<span class="expansion">n</span>uidit et eu<span class="expansion">m</span> destruere uoluit. et nul/lo c<span class="expansion">on</span>siliante malu<span class="expansion">m</span> i<span class="expansion">n</span>cepit. homo aut<span class="expansion">em</span> pre/ceptu<span class="expansion">m</span> d<span class="expansion">e</span>i audiuit. s<span class="expansion">ed</span> tantu<span class="expansion">m</span> similis e<span class="expansion">ss</span>e con/cupiuit. et fallaci deceptore consiliante d<span class="expansion">e</span>o / n<span class="expansion">on</span> obediuit. Postea uidens diabolus origi/nale <span class="correction" data-correction="correxit">b</span>onu<span class="expansion">m</span> q<span class="expansion">uo</span>d in <span class="custom-entry person" data-register-id="23b99db7-3668-4d72-8b91-51d2b6bf1cf0" data-register-type="person">abel</span> oriri cepit qui / bonitate<span class="expansion">m</span> mea<span class="expansion">m</span> in op<span class="expansion">er</span>ib<span class="expansion">us</span> suis gustauit. a/crit<span class="expansion">er</span> in semetipso i<span class="expansion">n</span>fremuit. et homi/ni homicidiu<span class="expansion">m</span> p<span class="expansion">er</span>suadit. ut homo  ho/mine<span class="expansion">m</span> destrueret. sic<span class="expansion">ut</span> et ille me destrue/re uoluit q<span class="expansion">u</span>od e<span class="expansion">ss</span>e n<span class="expansion">on</span> potuit. quia fortitu<span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0134" target="_blank">394v</a> ]</span>  dine<span class="expansion">m</span> mea<span class="expansion">m</span> nullus sup<span class="expansion">er</span>are pot<span class="expansion">est</span>. Et ita sua/dente diabolo facto homicidio! diabo/lus gauisus in semetipso dicebat. Vvach / homine<span class="expansion">m</span> de paradyso mea fortitudine e/ieci. vvach etia<span class="expansion">m</span> n<span class="expansion">un</span>c homine<span class="expansion">m</span> in t<span class="expansion">er</span>ra mi<span class="expansion">hi</span> denuo / seruire facio. Nam i<span class="expansion">n</span>strum<span class="expansion">en</span>tu<span class="expansion">m</span> altissimi / ab alio i<span class="expansion">n</span>strum<span class="expansion">en</span>to sibi simili in homicidio / diuidit<span class="expansion">ur</span>. Ego eni<span class="expansion">m</span> altissimu<span class="expansion">m</span> sup<span class="expansion">er</span>are n<span class="expansion">on</span> ualui. / q<span class="expansion">uonia</span>m nec uertice<span class="expansion">m</span> nec postremitate<span class="expansion">m</span> in eo / uidi. s<span class="expansion">ed</span> n<span class="expansion">un</span>c habeo i<span class="expansion">n</span>strum<span class="expansion">en</span>ta illi<span class="expansion">us</span> quę omne<span class="expansion">m</span> / uoluntate<span class="expansion">m</span> mea<span class="expansion">m</span> faciu<span class="expansion">n</span>t. ta<span class="expansion">m</span> se i<span class="expansion">n</span>uice<span class="expansion">m</span> occiden/do qua<span class="expansion">m</span> p<span class="expansion">er</span>ficiendo omne<span class="expansion">m</span> reliqua<span class="expansion">m</span> p<span class="expansion">er</span>suasio/ne<span class="expansion">m</span> mea<span class="expansion">m</span>. O qua<span class="expansion">m</span> magna<span class="expansion">m</span> potestate<span class="expansion">m</span> in istis / habeo. quia q<span class="expansion">uo</span>d ego in altitudine celi face/re n<span class="expansion">on</span> potui. hoc creatura ista in alia sibi si/mili me i<span class="expansion">n</span>stigante facit. et plus op<span class="expansion">er</span>at<span class="expansion">ur</span> qua<span class="expansion">m</span> / ego op<span class="expansion">er</span>atus sum q<span class="expansion">uonia</span>m q<span class="expansion">uo</span>d ego uolui et non / potui hoc ista facit. cu<span class="expansion">m</span> alt<span class="expansion">er</span>a alt<span class="expansion">er</span>am disp<span class="expansion">er</span> /dit. Et ex his op<span class="expansion">er</span>ib<span class="expansion">us</span> magnu<span class="expansion">m</span> gaudiu<span class="expansion">m</span> dia/bolus in se habuit. quia <span class="custom-entry person" data-register-id="25a07908-cf0a-488d-981d-16be9467f091" data-register-type="person">cain</span> fratre<span class="expansion">m</span> suum / <span class="custom-entry person" data-register-id="1199441c-9724-48b1-8cfc-277c51ed1657" data-register-type="person">abel</span> occidit. Vn<span class="expansion">de</span> etia<span class="expansion">m</span> gehenna iusto iudicio / plus in igne t<span class="expansion">un</span>c exarsit. qua<span class="expansion">m</span> ante ide<span class="expansion">m</span> ho/micidiu<span class="expansion">m</span> faceret. Ego aut<span class="expansion">em</span> qui su<span class="expansion">m</span> acutis/sima lux dico. Ach ach ach homicidio. q<span class="expansion">u</span>od / suadente diabolo exortu<span class="expansion">m</span> e<span class="expansion">st</span>. ut bonu<span class="expansion">m</span> op<span class="expansion">us</span> / deiceret. O ue huic malo. ubi i<span class="expansion">n</span>nocentia / i<span class="expansion">n</span>tegritate<span class="expansion">m</span> sua<span class="expansion">m</span> p<span class="expansion">er</span>didit. Un<span class="expansion">de</span> terra luget / q<span class="expansion">uonia</span>m sudor sanguine<span class="expansion">m</span> bibit. ubi homo ho/mine<span class="expansion">m</span> occidit. Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> et celu<span class="expansion">m</span> plangit. et / etia<span class="expansion">m</span> cet<span class="expansion">er</span>a elem<span class="expansion">en</span>ta lugent. asp<span class="expansion">er</span>sa uelut in co/lore sanguinis. quia in officijs suis subdi/ta su<span class="expansion">n</span>t hominib<span class="expansion">us</span> s<span class="expansion">e</span>c<span class="expansion">un</span>d<span class="expansion">u</span>m q<span class="expansion">uo</span>d causa et necessi/tas hominu<span class="expansion">m</span> postulat. O homicide i<span class="expansion">n</span>  mag/na<span class="expansion">m</span> ruina<span class="expansion">m</span> caditis. quando p<span class="expansion">er</span> corp<span class="expansion">or</span>ale<span class="expansion">m</span> occi/sione<span class="expansion">m</span> sep<span class="expansion">ar</span>atis hoc ab homine q<span class="expansion">uo</span>d in eo con/iunxi. Nam cu<span class="expansion">m</span> homo malu<span class="expansion">m</span> hoc op<span class="expansion">er</span>atur / in temeritate op<span class="expansion">er</span>is sui. uox sanguinis / illi<span class="expansion">us</span> qui sic effusus e<span class="expansion">st</span>. ad sup<span class="expansion">er</span>na eiulando / in dolore ei<span class="expansion">us</span>de<span class="expansion">m</span> penę uolat. ita q<span class="expansion">uo</span>d elem<span class="expansion">en</span>ta / ext<span class="expansion">er</span>rita clamore<span class="expansion">m</span> illu<span class="expansion">m</span> suscipiu<span class="expansion">n</span>t. et eum / sursu<span class="expansion">m</span> deferu<span class="expansion">n</span>t. q<span class="expansion">uonia</span>m anima p<span class="expansion">ro</span>pt<span class="expansion">er</span> dolore<span class="expansion">m</span> / carnis occisi habitaculi sui ta<span class="expansion">m</span>diu eiu/lat. quousq<span class="expansion">ue</span> sup<span class="expansion">er</span>nus iudex in zelo suo / clamore<span class="expansion">m</span> ei<span class="expansion">us</span> exaudiat. Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> o homi nes audite q<span class="expansion">uo</span>d dictu<span class="expansion">m</span> e<span class="expansion">st</span>. Ecce uox sanguinis / fr<span class="expansion">atr</span>is tui <span class="custom-entry person" data-register-id="b54cf872-6e5f-4e08-995d-640e16670452" data-register-type="person">abel</span> clamat ad me de t<span class="expansion">er</span>ra. Anima / maximu<span class="expansion">m</span> planctu<span class="expansion">m</span> dat in habitaculo cor/p<span class="expansion">or</span>is sui. cu<span class="expansion">m</span> senserit illud in occisione dei/ci. S<span class="expansion">ed</span> animę s<span class="expansion">an</span>c<span class="expansion">t</span>or<span class="expansion">um</span> quor<span class="expansion">um</span> corp<span class="expansion">or</span>a p<span class="expansion">ro</span>pt<span class="expansion">er</span> nom<span class="expansion">en</span> / meu<span class="expansion">m</span> occidunt<span class="expansion">ur</span>. sic in deiectione corp<span class="expansion">or</span>is sui / clama<span class="expansion">n</span>t. Vindica d<span class="expansion">omi</span>ne sanguine<span class="expansion">m</span> n<span class="expansion">ost</span>r<span class="expansion">u</span>m. q<span class="expansion">u</span>i / effusus e<span class="expansion">st</span>. Et hunc clamore<span class="expansion">m</span> cu<span class="expansion">m</span> celesti mi/licia ad celestia deferu<span class="expansion">n</span>t! quia templum / meu<span class="expansion">m</span> in eis destructu<span class="expansion">m</span> e<span class="expansion">st</span>. Animę aut<span class="expansion">em</span> illor<span class="expansion">um</span> / hominu<span class="expansion">m</span> qui contumeliis et criminib<span class="expansion">us</span> / suis efficiu<span class="expansion">n</span>t ut corp<span class="expansion">or</span>a eor<span class="expansion">um</span> occidant<span class="expansion">ur</span>. plan/ctu<span class="expansion">m</span> suu<span class="expansion">m</span> ad elem<span class="expansion">en</span>ta p<span class="expansion">ro</span>ducunt. s<span class="expansion">ed</span> eu<span class="expansion">m</span> sur/su<span class="expansion">m</span> ad celestia secreta eleuare n<span class="expansion">on</span> possunt. / q<span class="expansion">uonia</span>m in malignitate sua seipsos primu<span class="expansion">m</span> / p<span class="expansion">er</span>cutiu<span class="expansion">n</span>t. efficientes ut iusto iudicio i<span class="expansion">n</span>iq<span class="expansion">u</span>i/tatis suę ab alio occidant<span class="expansion">ur</span>. S<span class="expansion">ed</span> quocu<span class="expansion">m</span>q<span class="expansion">ue</span> mo<span class="expansion">do</span> / homo ab alio homine occidatur. deus / causa<span class="expansion">m</span> illa<span class="expansion">m</span> et s<span class="expansion">e</span>c<span class="expansion">un</span>d<span class="expansion">u</span>m uoluntate<span class="expansion">m</span> p<span class="expansion">er</span>cutientis. / et s<span class="expansion">e</span>c<span class="expansion">un</span>d<span class="expansion">u</span>m merita cadentis iuste examinat. / quia homo ad imagine<span class="expansion">m</span> et similitudine<span class="expansion">m</span> / d<span class="expansion">e</span>i factus e<span class="expansion">st</span>. Uos aut<span class="expansion">em</span> qui in hoc homicidio / feruetis. audite. O p<span class="expansion">er</span>egrini in his ueloci/bus criminib<span class="expansion">us</span> in gehenna sepultura u<span class="expansion">est</span>ra / e<span class="expansion">ss</span>et. nisi q<span class="expansion">uo</span>d i<span class="expansion">m</span>maculatus agnus qui p<span class="expansion">ro</span> re/de<span class="expansion">m</span>ptione mundi in cruce oblatus e<span class="expansion">st</span>. fixu/ra<span class="expansion">m</span> clauoru<span class="expansion">m</span> suor<span class="expansion">um</span> et effusione<span class="expansion">m</span> sanguinis / sui i<span class="expansion">n</span>spicit. Nam p<span class="expansion">ro</span>pt<span class="expansion">er</span> ista crimina quę / feruentes in homicidio p<span class="expansion">er</span>petratis. gaui/sus e<span class="expansion">st</span> sup<span class="expansion">er</span>bus i<span class="expansion">n</span>imicus u<span class="expansion">este</span>r! existimans q<span class="expansion">u</span>ia / homine<span class="expansion">m</span> sibi subiectu<span class="expansion">m</span> in sua potestate re/tinere possit. S<span class="expansion">ed</span> cu<span class="expansion">m</span> filius m<span class="expansion">eu</span>s in mundu<span class="expansion">m</span> / uenit. ide<span class="expansion">m</span> diabolus eu<span class="expansion">m</span> int<span class="expansion">er</span> homines con/uersari uidens dixit. Ecce alius ada<span class="expansion">m</span> ue/nit! et nescio un<span class="expansion">de</span> sit. Nam primu<span class="expansion">m</span> <span class="custom-entry person" data-register-id="20f6e579-f56b-40aa-94ef-d5b3c0fff690" data-register-type="person">ada</span><span class="expansion custom-entry person" data-register-id="20f6e579-f56b-40aa-94ef-d5b3c0fff690" data-register-type="person">m</span><span class="expansion"> </span> / deus de limo t<span class="expansion">er</span>rę creauit! s<span class="expansion">ed</span> nescio un<span class="expansion">de</span> / iste uenerit. <span class="custom-entry person" data-register-id="3a5bfcbd-bf8f-4a43-ac09-d5b9588cdb0b" data-register-type="person">Mat</span><span class="expansion custom-entry person" data-register-id="3a5bfcbd-bf8f-4a43-ac09-d5b9588cdb0b" data-register-type="person">er</span><span class="expansion"> </span> eius uidet et scit eum / filiu<span class="expansion">m</span> suu<span class="expansion">m</span> et eu<span class="expansion">m</span> amat. s<span class="expansion">ed</span> ego nescio de quo / ipsu<span class="expansion">m</span> concep<span class="expansion">er</span>it. quia illa<span class="expansion">m</span> uiru<span class="expansion">m</span> in concipien/do habere ignoro. Caro eni<span class="expansion">m</span> illi<span class="expansion">us</span> in uirgi/nitate i<span class="expansion">n</span>tegra e<span class="expansion">st</span>. Vn<span class="expansion">de</span> s<span class="expansion">un</span>t hec? Homine<span class="expansion">m</span> eni<span class="expansion">m</span> / in tam magna potestate mea habeo. ut / nullus eu<span class="expansion">m</span> mi<span class="expansion">hi</span> auferre possit quia fratre<span class="expansion">m</span> / suu<span class="expansion">m</span> occidit! et q<span class="expansion">uonia</span>m in om<span class="expansion">n</span>ib<span class="expansion">us</span> alijs op<span class="expansion">er</span>ib<span class="expansion">us</span>    <span class="pb d-block">[ <a href="http://tudigit.ulb.tu-darmstadt.de/show/Hild_R_Riesencodex/0135" target="_blank">395r</a> ]</span>suis uoluntate<span class="expansion">m</span> mea<span class="expansion">m</span> impleuit. Vn<span class="expansion">de</span> estimo / ut nullus eu<span class="expansion">m</span> mi<span class="expansion">hi</span> eripiat. Nam iusto iu/dicio eu<span class="expansion">m</span> habeo. Sic ille antiquus hostis / ta<span class="expansion">m</span>diu dubitauit quousq<span class="expansion">ue</span> filius meus i<span class="expansion">n</span> / cruce<span class="expansion">m</span> suspensus ad i<span class="expansion">n</span>fernu<span class="expansion">m</span> descendit et / ipsu<span class="expansion">m</span> fregit. ut homine<span class="expansion">m</span> liberaret. Quo/modo? In passione ei<span class="expansion">us</span> sudor ipsi<span class="expansion">us</span> abstulit / naufragiu<span class="expansion">m</span> libidinis quę pullulat in fer/uore sanguinis hominu<span class="expansion">m</span>. et tremor ipsi<span class="expansion">us</span> / extersit peccata i<span class="expansion">n</span>iustę copulationis eoru<span class="expansion">m</span>. / et ligatura qua<span class="expansion">m</span> passus e<span class="expansion">st</span>. ligatura<span class="expansion">m</span> qua<span class="expansion">m</span> / i<span class="expansion">n</span>obedientia i<span class="expansion">n</span>tulit hominib<span class="expansion">us</span> misericor/dit<span class="expansion">er</span> dissoluit. atq<span class="expansion">ue</span> cruor uulneru<span class="expansion">m</span> eius / crimina homicidar<span class="expansion">um</span> det<span class="expansion">er</span>sit. Qui in cruce / suspensus amaritudine<span class="expansion">m</span> poculi su<span class="expansion">m</span>psit. / p<span class="expansion">er</span> qua<span class="expansion">m</span> amarissima<span class="expansion">m</span> ira<span class="expansion">m</span> cui om<span class="expansion">n</span>ia mala / uicior<span class="expansion">um</span> adherent extinxit. et ita in cor/p<span class="expansion">or</span>e morte<span class="expansion">m</span> corp<span class="expansion">or</span>alit<span class="expansion">er</span> gustauit. p<span class="expansion">er</span> qua<span class="expansion">m</span> uni/uersa i<span class="expansion">n</span>strum<span class="expansion">en</span>ta diaboli plenit<span class="expansion">er</span> destrux/it. in quib<span class="expansion">us</span> homo concupiuit e<span class="expansion">ss</span>e sic<span class="expansion">ut</span> deus. / Et sic in om<span class="expansion">n</span>ib<span class="expansion">us</span> his signis cruciam<span class="expansion">en</span>toru<span class="expansion">m</span> / suor<span class="expansion">um</span> ad i<span class="expansion">n</span>fernu<span class="expansion">m</span> descendit. et illu<span class="expansion">m</span> fregit. / et potestate<span class="expansion">m</span> antiqui hostis ligauit. Tunc / ide<span class="expansion">m</span> diabolus erubuit. q<span class="expansion">u</span>od ta<span class="expansion">m</span> forte<span class="expansion">m</span> forti/tudine<span class="expansion">m</span> ignorauerat. quę ipsu<span class="expansion">m</span> ta<span class="expansion">m</span> fortit<span class="expansion">er</span> / in puteo inferni sup<span class="expansion">er</span>are ualuit. Et hoc / mo<span class="expansion">do</span> fiducia ei<span class="expansion">us</span> qua se homine<span class="expansion">m</span> posse reti/nere putabat om<span class="expansion">n</span>ino p<span class="expansion">ro</span>strata e<span class="expansion">st</span>. ut dei<span class="expansion">n</span> /ceps nullus homo in ta<span class="expansion">m</span> magnis crimi/nib<span class="expansion">us</span> si<span class="correction" data-correction="correxit">t</span>. quin uulnera ei<span class="expansion">us</span> curari possi<span class="expansion">n</span>t. / si ea p<span class="expansion">er</span> penitentia<span class="expansion">m</span> mundare curauerit. / Quap<span class="expansion">ro</span>pt<span class="expansion">er</span> laus deo sit. Nunc penitens publi/canus gaudeat et penitens peccator in ue/ra leticia parte<span class="expansion">m</span> habeat. quia om<span class="expansion">n</span>ia celestia / sup<span class="expansion">er</span> ipsos gaudebu<span class="expansion">n</span>t. quando illu<span class="expansion">m</span> qui eos / suis uulnerib<span class="expansion">us</span> de morte eripuit uidebu<span class="expansion">n</span>t. / ita si ad celestia se sursu<span class="expansion">m</span> uolunt erigere. et / m<span class="expansion">en</span>daciu<span class="expansion">m</span> illud fugere. q<span class="expansion">uo</span>d p<span class="expansion">ro</span>pt<span class="expansion">er</span> mala deside/ria sua me spreuer<span class="expansion">un</span>t. ubi uoluntate<span class="expansion">m</span> mea<span class="expansion">m</span> / n<span class="expansion">on</span> i<span class="expansion">n</span>spexer<span class="expansion">un</span>t. s<span class="expansion">ed</span> semetipsos decep<span class="expansion">er</span>u<span class="expansion">n</span>t. Nam si / p<span class="expansion">os</span>tea ad me respiciu<span class="expansion">n</span>t et mala op<span class="expansion">er</span>a sua de/seru<span class="expansion">n</span>t. in pura confessione sic dicentes pec/cauim<span class="expansion">us</span> d<span class="expansion">omi</span>ne! om<span class="expansion">n</span>is celestis exercit<span class="expansion">us</span> in rede<span class="expansion">m</span>p/tione eor<span class="expansion">um</span> quia penitentia<span class="expansion">m</span> fecer<span class="expansion">un</span>t gaudebit. O filij carissimi recordamini pij cre/atoris u<span class="expansion">est</span>ri. qui uos redemit ab om<span class="expansion">n</span>ib<span class="expansion">us</span> pla/gis criminu<span class="expansion">m</span> u<span class="expansion">est</span>ror<span class="expansion">um</span>. et qui uos in sanguine / dilecti filij sui mundauit a pessimo malo / homicidij. O ue huic malo q<span class="expansion">uo</span>d <span class="custom-entry person" data-register-id="d4a099d2-b0b0-4e4c-a499-cdc630c020ca" data-register-type="person">cain</span> op<span class="expansion">er</span>at<span class="expansion">us</span> / e<span class="expansion">st</span> p<span class="expansion">ro</span>pt<span class="expansion">er</span> ignominia<span class="expansion">m</span> irę suę! quę socia mor/tis e<span class="expansion">st</span>. Nam et finis u<span class="expansion">este</span>r qui facit dissolutio/ne<span class="expansion">m</span> corp<span class="expansion">or</span>is u<span class="expansion">est</span>ri. in magnis dolorib<span class="expansion">us</span> p<span class="expansion">er</span> om<span class="expansion">ne</span>s / uenas u<span class="expansion">est</span>ras uobis adheret. hoc sentiens et / ostendens in dolorib<span class="expansion">us</span> suis q<span class="expansion">u</span>od <span class="custom-entry person" data-register-id="c1b09411-7245-467f-a3e3-dc9f9e26b74f" data-register-type="person">abel</span> p<span class="expansion">er</span> homi/cidiu<span class="expansion">m</span> corp<span class="expansion">or</span>ale<span class="expansion">m</span> uita<span class="expansion">m</span> in dolorib<span class="expansion">us</span> finiuit. cu<span class="expansion">m</span> / anima<span class="expansion">m</span> ei<span class="expansion">us</span> de habitaculo corp<span class="expansion">or</span>is sui. <span class="custom-entry person" data-register-id="1f1de371-032c-4b0e-83b9-d070f144ad07" data-register-type="person">frater</span> / ipsi<span class="expansion">us</span> p<span class="expansion">er</span> malu<span class="expansion">m</span> homicidjj p<span class="expansion">r</span>imu<span class="expansion">m</span> exire coegit. / N<span class="expansion">un</span>c illis sit salus et rede<span class="expansion">m</span>ptio in sanguine / dilecti filij mei. qui solliciti s<span class="expansion">un</span>t currentes / ad uera<span class="expansion">m</span> penitentia<span class="expansion">m</span> p<span class="expansion">ro</span>pt<span class="expansion">er</span> peccata sua./`;

const editor = useEditor({
  content: r262,
  extensions: [StarterKit, CustomSpan],
});

onMounted(() => {
  console.log(editor.value.getJSON());
  // placeCaret();
});

onUpdated(() => {
  // placeCaret();
});

onBeforeUnmount(() => {
  editor.value.destroy();
});

const {
  isContentEditable,
  isRedrawMode,
  keepTextOnPagination,
  redrawMode,
  execCommand,
  placeCaret,
  redo,
  undo,
  toggleRedrawMode,
} = useEditorStore();
const { addToastMessage } = useAppStore();
const { getAnnotationConfig } = useGuidelinesStore();
const { afterEndIndex, beforeStartIndex, snippetCharacters, totalCharacters } =
  useCharactersStore();
const { snippetAnnotations } = useAnnotationStore();
const { selectedOptions } = useFilterStore();

useEventListener(window, 'forceCaretPlacement', placeCaret);

const editorRef = ref<HTMLDivElement>(null);
const tiptapEditor = useTemplateRef('tiptapEditor');

// This calculation is needed since totalCharacters is decoupled and only updated just before saving changes.
const charCounterMessage: ComputedRef<string> = computed(() => {
  const charsBeforeCount: number = beforeStartIndex.value ? beforeStartIndex.value + 1 : 0;
  const charsAfterCount: number = afterEndIndex.value
    ? totalCharacters.value.length - afterEndIndex.value
    : 0;
  const total: number = charsBeforeCount + snippetCharacters.value.length + charsAfterCount;
  const current: number = snippetCharacters.value.length;

  return `${current.toLocaleString()} of ${total.toLocaleString()} characters`;
});

function handleInput(event: InputEvent) {
  event.preventDefault();

  switch (event.inputType) {
    // Text Insertion
    case 'insertText':
      handleInsertText(event);
      break;
    case 'insertReplacementText':
      handleInsertReplacementText(event);
      break;
    case 'insertFromPaste':
      handleInsertFromPaste();
      break;
    case 'insertFromDrop':
      handleInsertFromDrop(event);
      break;
    case 'insertFromYank':
      handleInsertFromYank(event);
      break;

    // Text Deletion
    case 'deleteWordBackward':
      handleDeleteWordBackward();
      break;
    case 'deleteWordForward':
      handleDeleteWordForward();
      break;
    case 'deleteContentBackward':
      handleDeleteContentBackward();
      break;
    case 'deleteContentForward':
      handleDeleteContentForward();
      break;
    case 'deleteByCut':
      handleDeleteByCut();
      break;
    case 'deleteByDrag':
      handleDeleteByDrag();
      break;
    case 'deleteSoftLineBackward':
      handleDeleteSoftLineBackward(event);
      break;
    case 'deleteSoftLineForward':
      handleDeleteSoftLineForward(event);
      break;
    case 'deleteHardLineBackward':
      handleDeleteHardLineBackward(event);
      break;
    case 'deleteHardLineForward':
      handleDeleteHardLineForward(event);
      break;

    default:
      console.log('Unhandled input type:', event.inputType);
  }
}

function handleInsertText(event: InputEvent): void {
  const newCharacter: Character = createNewCharacter(event.data || '');

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: [newCharacter] });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: [newCharacter] });
  }
}

function handleInsertReplacementText(event: InputEvent): void {
  console.log('Replacement event:', event);

  // const newCharacter: ICharacter = {
  //   uuid: crypto.randomUUID(),
  //   text: event.data || '',
  // };
  // characters.value.push(newCharacter);
  // Additional logic for replacement can be added here
}

async function handleInsertFromPaste(): Promise<void> {
  const text: string = await navigator.clipboard.readText();

  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: newCharacters });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: newCharacters });
  }
}

function handleInsertFromDrop(event: InputEvent): void {
  const dataTransfer: DataTransfer = event.dataTransfer;

  if (!dataTransfer) {
    return;
  }

  const text: string = dataTransfer.getData('text');
  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: newCharacters });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: newCharacters });
  }
}

function handleInsertFromYank(event: InputEvent): void {
  console.log('Yank event:', event);
  // Handle yank logic
}

// Text Deletion Handlers
function handleDeleteWordBackward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  // TODO: In Firefox, the range type is always Caret -> Overwrite default behaviour?
  // See https://www.reddit.com/r/firefox/comments/gxj9qd/does_anyone_else_find_that_ctrlbackspace_on/
  if (type === 'Caret') {
    if (isEditorElement(range.startContainer)) {
      return;
    }

    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCaretAtBeginning(spanToDelete, editorRef)) {
      return;
    }

    const { rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteWordBefore', { rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    handleDeleteContentBackward();
  }
}
function handleDeleteWordForward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtEnd(referenceSpanElement, editorRef)) {
        console.log('Caret is at end');
        return;
      }

      leftUuid = isCaretAtBeginning(referenceSpanElement, editorRef)
        ? null
        : getCharacterUuidFromSpan(referenceSpanElement);
    }

    try {
      execCommand('deleteWordAfter', { leftUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    handleDeleteContentForward();
  }
}

function handleDeleteContentBackward(): void {
  // If there is no text, nothing should happen
  // TODO: Would be cleaner to do this in the store and use DOM methods herein component...
  if (snippetCharacters.value.length === 0) {
    console.log('Caret is at beginning');
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    if (isEditorElement(range.startContainer)) {
      return;
    }

    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCaretAtBeginning(spanToDelete, editorRef)) {
      console.log('Caret is at beginning');
      return;
    }

    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  }
}

function handleDeleteContentForward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = getCharacterUuidFromSpan(editorRef.value.firstElementChild);
      rightUuid = getCharacterUuidFromSpan(editorRef.value.lastElementChild);
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let spanToDelete: HTMLSpanElement;

      if (range.startOffset === 0) {
        spanToDelete = referenceSpanElement;
      } else {
        if (referenceSpanElement === editorRef.value.lastElementChild) {
          return;
        } else {
          spanToDelete = referenceSpanElement.nextElementSibling as HTMLSpanElement;
        }
      }

      leftUuid = getCharacterUuidFromSpan(spanToDelete.previousElementSibling);
      rightUuid = getCharacterUuidFromSpan(spanToDelete.nextElementSibling);
    }

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        addToastMessage({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  }
}

function handleDeleteByCut(): void {
  const { range } = getSelectionData();

  const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

  try {
    execCommand('deleteText', { leftUuid, rightUuid });
  } catch (e: unknown) {
    if (e instanceof TextOperationError) {
      addToastMessage({
        severity: e.severity,
        summary: 'Invalid Text Operation',
        detail: e.message,
        life: 3000,
      });
    }
  }

  handleCopy();
}

function handleDeleteByDrag(): void {
  // TODO: Should this be handled? Drag and drop with annotated text will be very complex
  return;
}

function handleDeleteSoftLineBackward(event: InputEvent): void {
  console.log('DeleteSoftLineBackward event:', event);
  // Handle delete soft line backward logic
}

function handleDeleteSoftLineForward(event: InputEvent): void {
  console.log('DeleteSoftLineForward event:', event);
  // Handle delete soft line forward logic
}

function handleDeleteHardLineBackward(event: InputEvent): void {
  console.log('DeleteHardLineBackward event:', event);
  // Handle delete hard line backward logic
}

function handleDeleteHardLineForward(event: InputEvent): void {
  console.log('DeleteHardLineForward event:', event);
  // Handle delete hard line forward logic
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isContentEditable.value) {
    return;
  }

  if (!event.ctrlKey || event.key.toLowerCase() !== 'z') {
    return;
  }

  if (event.shiftKey) {
    redo();
    return;
  } else {
    undo();
    return;
  }
}

async function handleCopy(): Promise<void> {
  const { selection } = getSelectionData();
  const text: string = selection.toString();

  if (text.length === 0) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error: unknown) {
    console.error('Failed to copy text to clipboard:', error);
  }
}

/**
 * Return the characters that the user wants to annotate. This is the selection as an array of Character objects.
 *
 * @returns {Character[]} The characters that the user wants to annotate.
 */
function getCharactersToAnnotate(): Character[] {
  const spans: HTMLSpanElement[] = getSpansToAnnotate();
  const uuids: string[] = spans.map((span: HTMLSpanElement) => span.id);
  const characters: Character[] = snippetCharacters.value.filter((c: Character) =>
    uuids.includes(c.data.uuid),
  );

  return characters;
}

function handleMouseUp(): void {
  if (!isRedrawMode.value) {
    return;
  }

  try {
    const annotation: Annotation = snippetAnnotations.value.find(
      anno => anno.data.properties.uuid === redrawMode.value.annotationUuid,
    );

    const config: AnnotationType = getAnnotationConfig(annotation.data.properties.type);
    isSelectionValid(config);

    const selectedCharacters: Character[] = getCharactersToAnnotate();

    if (!annotation) {
      throw new Error('Annotation not found, abort');
    }

    execCommand('redrawAnnotation', {
      annotation: annotation,
      characters: selectedCharacters,
    });

    toggleRedrawMode({ direction: 'off', cause: 'success' });
  } catch (error: unknown) {
    if (error instanceof AnnotationRangeError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Annotation type not enabled',
        detail: error.message,
        life: 3000,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

function isSelectionValid(config: AnnotationType): boolean {
  const { range, type } = getSelectionData();

  if (!range || type === 'None') {
    throw new AnnotationRangeError('No valid text selected.');
  }

  const commonAncestorContainer: Node | undefined | Element = range.commonAncestorContainer;

  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    throw new AnnotationRangeError('Selection is outside the text component.');
  }

  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    throw new AnnotationRangeError('Text selection is outside the text component.');
  }

  if (type === 'Caret' && !config.isZeroPoint && !config.isSeparator) {
    throw new AnnotationRangeError('Select some text to annotate.');
  }

  if ((type === 'Caret' && config.isZeroPoint) || config.isSeparator) {
    if (isEditorElement(range.startContainer)) {
      throw new AnnotationRangeError(
        'For creating zero-point annotations, place the caret between two characters',
      );
    } else {
      const parentSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      const caretIsAtBeginning: boolean =
        range.startOffset === 0 && !parentSpanElement.previousElementSibling;
      const caretIsAtEnd: boolean =
        range.startOffset === 1 && !parentSpanElement.nextElementSibling;

      if (caretIsAtBeginning || caretIsAtEnd) {
        if (config.isZeroPoint) {
          throw new AnnotationRangeError(
            'To create zero-point annotations, place the caret between two characters',
          );
        }
        if (config.isSeparator) {
          throw new AnnotationRangeError(
            `To create ${config.type} annotations, the caret can not be at the start or end`,
          );
        }
      }
    }
  }

  if (type === 'Range' && config.isZeroPoint) {
    throw new AnnotationRangeError(
      'To create zero-point annotations, place the caret between two characters',
    );
  }

  if (type === 'Range' && config.isSeparator) {
    throw new AnnotationRangeError(
      `To create ${config.type} annotations, place the caret between two characters`,
    );
  }

  return true;
}

function createNewCharacter(char: string): Character {
  return {
    data: {
      uuid: crypto.randomUUID(),
      text: char,
    },
    annotations: [],
  };
}

const textLength = computed(() => editor.value?.getText().length.toLocaleString());
</script>

<template>
  <div class="flex justify-content-end">
    <label class="label">Keep text on pagination</label>
    <ToggleSwitch title="Switch pagination mode" v-model="keepTextOnPagination" />
  </div>
  <div class="counter text-right mb-4">
    <small>{{ textLength }}</small>
  </div>
  <!-- TODO: Restructure/rename this mess -->
  <div class="content flex flex-column flex-1 px-3 py-1 overflow-hidden">
    <div class="text-container h-full p-2 flex gap-1 overflow-hidden">
      <div class="scroll-container flex-1 overflow-y-scroll">
        <editor-content ref="tiptapEditor" id="text" class="w-full" :editor="editor" />
      </div>

      <EditorTextNavigation />
    </div>
  </div>
</template>

<style scoped>
#text > div {
  background-color: white;
  border-radius: 3px;
  outline: 1px solid var(--color-focus);

  /* IE, Edge and Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */

  /* Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }

  &:has(:focus-visible) {
    box-shadow: var(--box-shadow-focus);
    outline: 0;
  }
}

#text {
  outline: 0;
  position: relative;
  background-color: white;
  line-height: 1.75rem;
  caret-color: black;
  z-index: 99999;
}

#text.async-overlay {
  background-color: white;
  opacity: 0.6;
}

#text > span {
  white-space-collapse: break-spaces;
  position: relative;

  &.highlight {
    background-color: yellow;
  }
}
</style>

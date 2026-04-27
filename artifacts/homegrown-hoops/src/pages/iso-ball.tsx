import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, ChevronLeft, RotateCcw, Zap, Trophy, Timer, BookOpen, Medal, Lock, Info } from "lucide-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIsoBallLeaderboard } from "@workspace/api-client-react";

type Difficulty = "rookie" | "varsity" | "elite";
type AnswerKey = "A" | "B" | "C" | "D";

interface Question {
  q: string;
  opts: [string, string, string, string];
  ans: AnswerKey;
}

const QUESTIONS: Record<Difficulty, Question[]> = {
  rookie: [
    // Q1 → A
    { q: "How many players from each team are on the court at one time?", opts: ["5", "4", "6", "7"], ans: "A" },
    // Q2 → B
    { q: "How many seconds does a player have in the key before a violation?", opts: ["2", "3", "4", "5"], ans: "B" },
    // Q3 → C
    { q: "A player catches a pass, takes two steps, and shoots a layup. Is this travelling?", opts: ["Yes — the gather step still counts, making it three steps total", "Only in the paint where the gather rule doesn't apply", "No — the two-step rule allows this after the gather", "Yes — but referees rarely call it at the youth level"], ans: "C" },
    // Q4 → D
    { q: "What does a referee making a T shape with their hands mean?", opts: ["Timeout", "Travelling", "Ten-second violation", "Technical foul"], ans: "D" },
    // Q5 → A
    { q: "How many seconds does a team have to advance past halfcourt?", opts: ["8", "5", "15", "10"], ans: "A" },
    // Q6 → B
    { q: "What happens when a team accumulates too many fouls in a quarter?", opts: ["All further fouls result in automatic ejection of the fouling player", "Bonus free throws on non-shooting fouls for the rest of the quarter", "The opposing team is awarded two technical free throws plus possession", "The fouling team loses one of their remaining timeouts as a penalty"], ans: "B" },
    // Q7 → C
    { q: "How many fouls does a player need to foul out?", opts: ["4", "6", "5", "3"], ans: "C" },
    // Q8 → D
    { q: "What is a fast break?", opts: ["A quick set play called by the coach during a timeout", "A foul committed when a defender grabs a sprinting offensive player from behind", "A lineup change designed to bring in your best scorers quickly", "Advancing the ball before the defense has time to set up"], ans: "D" },
    // Q9 → A
    { q: "What does boxing out mean?", opts: ["Positioning your body between an opponent and the basket to secure rebounds", "Trapping the ball handler in the corner using two defenders", "Setting a legal screen in the paint to free up a cutter", "Holding your ground in the post to receive an entry pass"], ans: "A" },
    // Q10 → B
    { q: "What is a double dribble?", opts: ["Dribbling so hard the ball bounces above shoulder height", "Dribbling with two hands at once, or stopping your dribble and then starting it again", "Switching your dribbling hand mid-move without stopping the ball", "Losing control of the ball while dribbling and then recovering it yourself"], ans: "B" },
    // Q11 → C
    { q: "What is an assist?", opts: ["A pass to a teammate that creates a scoring opportunity, even if the shot isn't made", "Credit given when a defender helps stop a drive and forces a missed shot", "A pass that directly leads to a teammate making a basket", "A stat given to the coach when a designed play results in a score"], ans: "C" },
    // Q12 → D
    { q: "What is a turnover?", opts: ["When the defense rotates incorrectly and gives up an easy basket", "When a shot bounces off the rim and the offensive team recovers it", "When a player switches position with a teammate during a live play", "When the offense loses possession of the ball to the defense"], ans: "D" },
    // Q13 → A
    { q: "Where must a player stand when shooting a free throw?", opts: ["On the free throw line, not crossing it until the ball hits the rim", "Behind the three-point line, choosing any spot they are comfortable with", "Anywhere inside the key as long as they don't move while shooting", "At the elbow of the free throw line, squared up to the basket"], ans: "A" },
    // Q14 → B
    { q: "What is a jump ball?", opts: ["When a player leaps to intercept a pass at the peak of their jump", "When two players gain simultaneous possession and the referee tosses the ball between them", "A jump shot attempt taken from beyond the arc to break a tie", "A foul called when a defender leaves their feet to draw contact"], ans: "B" },
    // Q15 → C
    { q: "What does man-to-man defense mean?", opts: ["A defense where everyone sags toward the paint and covers the nearest offensive player", "All five defenders collapse on the ball handler to force a turnover", "Each defender is assigned to and responsible for one specific offensive player", "Defenders switch assignments after every screen to prevent mismatches"], ans: "C" },
    // Q16 → D
    { q: "What is a rebound?", opts: ["An extra free throw awarded after an offensive player tips in a missed attempt", "A pass deliberately skipped off the floor to avoid a defender", "A sprint back to defend after losing possession on a turnover", "Gaining possession of the ball after a missed shot"], ans: "D" },
    // Q17 → A
    { q: "What is the shot clock for?", opts: ["Limiting how long the offense can hold the ball before attempting a shot", "Tracking when substitutions are allowed and notifying the bench when to rotate", "Tracking how long each individual player has been on the court", "Signaling when each quarter is approaching its final two-minute mark"], ans: "A" },
    // Q18 → B
    { q: "What is an offensive foul?", opts: ["A foul called on the defense for denying a clear path to the basket", "A foul committed by the offensive player, such as charging into a set defender", "Any contact foul inside the paint regardless of who initiated the contact", "A foul drawn by a perimeter player that automatically results in three free throws"], ans: "B" },
    // Q19 → C
    { q: "What does 'shooting pocket' mean?", opts: ["The spot on the court from which a player takes the majority of their attempts", "A defensive technique for taking away a shooter's preferred hand side", "The position where a player naturally catches and shoots in one fluid motion", "The gap between two defenders that an offensive player targets for a drive"], ans: "C" },
    // Q20 → D
    { q: "What is goaltending?", opts: ["Blocking a shot attempt cleanly from behind the three-point line", "Standing in the paint for more than three seconds while waiting for a pass", "Swatting a shot out of a player's hands before they fully release the ball", "Illegally interfering with a shot on its downward arc or while it is on the rim"], ans: "D" },
    // Q21 → B
    { q: "What is a free throw?", opts: ["A throw from halfcourt", "An uncontested shot from the free throw line awarded after certain fouls", "A pass to a teammate", "A shot with no defenders nearby"], ans: "B" },
    // Q22 → A
    { q: "What does it mean when a referee signals with both arms crossed above their head?", opts: ["Game over", "Jump ball", "Timeout", "Technical foul"], ans: "A" },
    // Q23 → C
    { q: "How many timeouts does each team typically get per game in youth basketball?", opts: ["2", "3", "5", "1"], ans: "C" },
    // Q24 → B
    { q: "What is a slam dunk?", opts: ["A three point shot", "When a player jumps and throws the ball directly through the hoop from above", "A behind the back pass", "A half court shot"], ans: "B" },
    // Q25 → B
    { q: "What does it mean to be called for a carry or palm?", opts: ["Carrying an injured player", "When a player turns their hand under the ball while dribbling stopping the balls momentum", "Throwing the ball too hard", "Catching a pass with one hand"], ans: "B" },
    // Q26 → B
    { q: "What is the purpose of the three point line?", opts: ["To mark out of bounds", "To separate shots worth two points from shots worth three points", "To show where the free throw lane starts", "To mark halfcourt"], ans: "B" },
    // Q27 → B
    { q: "What does it mean when a player is called for a lane violation on a free throw?", opts: ["They stepped out of bounds", "They entered the lane too early before the ball hits the rim", "They missed the free throw", "They bounced the ball before shooting"], ans: "B" },
    // Q28 → B
    { q: "What is a no look pass?", opts: ["A pass thrown behind the back", "A pass where the passer looks in a different direction from where they are throwing to fool the defense", "A bounce pass", "A lob pass"], ans: "B" },
    // Q29 → B
    { q: "What does it mean to set a screen?", opts: ["Blocking a shot", "When an offensive player legally stands in the path of a defender to free up a teammate", "Calling a timeout", "Switching defensive assignments"], ans: "B" },
    // Q30 → C
    { q: "What is a point guard typically responsible for?", opts: ["Scoring as many points as possible", "Rebounding", "Running the offense directing the team and handling the ball", "Defending the opposing center"], ans: "C" },
    // Q31 → B
    { q: "What happens when the ball goes out of bounds?", opts: ["The other team gets a free throw", "The team that did not touch the ball last gets possession and inbounds the ball", "The game stops and restarts with a jump ball", "The player who touched it last gets a foul"], ans: "B" },
    // Q32 → B
    { q: "What is a layup?", opts: ["A shot taken from halfcourt", "A close range shot where a player uses the backboard or lays the ball up toward the basket off one foot", "A dunk", "A free throw"], ans: "B" },
    // Q33 → B
    { q: "What does the term paint refer to in basketball?", opts: ["The color of the court", "The rectangular key area in front of the basket", "The three point line", "The halfcourt line"], ans: "B" },
    // Q34 → B
    { q: "What is a buzzer beater?", opts: ["A shot that hits the backboard loudly", "A shot made just as the game clock or shot clock expires", "A shot taken from halfcourt", "A free throw made under pressure"], ans: "B" },
    // Q35 → B
    { q: "What does it mean to be called for a backcourt violation?", opts: ["Playing too rough", "When a team advances the ball past halfcourt then passes it back across the halfcourt line", "Standing out of bounds", "Taking too long to inbound"], ans: "B" },
    // Q36 → C
    { q: "What is a shooting guard typically known for?", opts: ["Running the offense", "Rebounding and defending", "Scoring from the perimeter and off the catch", "Setting screens for teammates"], ans: "C" },
    // Q37 → B
    { q: "What does it mean to crash the boards?", opts: ["Running into another player", "Aggressively pursuing rebounds after a shot", "Driving hard to the basket", "Setting a screen near the basket"], ans: "B" },
    // Q38 → C
    { q: "What is a power forward typically responsible for?", opts: ["Running the offense", "Three point shooting", "Physical play near the basket rebounding and defending bigger players", "Full court defense"], ans: "C" },
    // Q39 → B
    { q: "What does it mean when a team is in the bonus?", opts: ["They are winning by a large margin", "They have accumulated enough team fouls that the other team shoots free throws on every foul", "They have scored a bonus three point shot", "They have an extra timeout"], ans: "B" },
    // Q40 → C
    { q: "What is a center typically responsible for?", opts: ["Bringing the ball up the court", "Three point shooting", "Protecting the rim rebounding and scoring near the basket", "Full court pressure defense"], ans: "C" },
  ],
  varsity: [
    // V1 → A
    { q: "A team inbounds from halfcourt, down 2, with 2 seconds left. Pass hits the backboard and goes in. Ruling?", opts: ["No basket — using the backboard on an inbound play is illegal", "3 points — the play started behind the arc so it counts as three", "2 points and overtime — the ball was in play when time expired", "2 points — backboard contact means the clock must restart from zero"], ans: "A" },
    // V2 → B
    { q: "What is a pick and roll?", opts: ["A perimeter player catches a pass and shoots immediately off the screen", "An offensive player sets a screen for the ball handler, then cuts to the basket", "A defensive technique where two players funnel the ball handler into a trap", "Two offensive players switch positions simultaneously to confuse the defense"], ans: "B" },
    // V3 → C
    { q: "What does help defense mean?", opts: ["Verbally directing teammates by calling out screens and opponent positions", "An intentional foul committed deliberately to prevent a fast-break layup", "A defender leaving their assignment to stop an opponent who has beaten their teammate", "Sagging several feet off your assignment to clog the paint and protect the rim"], ans: "C" },
    // V4 → D
    { q: "Difference between a blocking and charging foul?", opts: ["They are the same call — the difference is just which team the referee favors", "Blocking is called on the offense; charging is always called on the defense", "Charging only applies inside the restricted area under the basket", "Blocking means the defender had no legal position; charging means the defender was set and the offensive player ran into them"], ans: "D" },
    // V5 → A
    { q: "What is a skip pass?", opts: ["A long pass across the court to the weak side, bypassing intermediate defenders", "A quick bounce pass thrown before the defense can rotate to close out", "A no-look pass thrown in the opposite direction from where the passer is looking", "A behind-the-back pass used to hit a cutter breaking along the baseline"], ans: "A" },
    // V6 → B
    { q: "In a 2-3 zone, what do the numbers represent?", opts: ["Two forwards protecting the paint, three guards covering the perimeter", "Two defenders at the top of the key, three spread across the baseline", "Two defenders on the ball side, three rotating to the weak side on each pass", "Two defenders at the elbows, three stationed along the three-point line"], ans: "B" },
    // V7 → C
    { q: "What is motion offense?", opts: ["A series of scripted plays run in sequence based on what the defense shows", "An offense that only pushes pace on fast breaks and sets up in transition", "A free-flowing offensive system where players read the defense and make decisions without predetermined plays", "An offense built entirely around isolating your best scorer one-on-one each possession"], ans: "C" },
    // V8 → D
    { q: "What is a back screen?", opts: ["A screen set behind the ball handler to allow a guard to curl into the paint", "A screen set along the baseline to free a shooter coming off the corner", "A screen set near halfcourt to create separation for a full-court skip pass", "A screen set on a defender positioned between the screener and basket, freeing a teammate to cut toward the ball"], ans: "D" },
    // V9 → A
    { q: "What is an 'and-one'?", opts: ["Making a basket while being fouled, earning one additional free throw", "A three-point play where a player draws a foul on a made three-point shot", "An isolation play specifically designed to draw contact and stop the clock", "An extra free throw added when a player converts both shots in the bonus"], ans: "A" },
    // V10 → B
    { q: "What does transition defense mean?", opts: ["Switching from man-to-man to zone defense when the opposing team pushes pace", "Getting back defensively as quickly as possible when your team loses possession", "A post defender rotating to protect the rim whenever the perimeter is beaten", "Switching defensive assignments on every screen to neutralize set offensive plays"], ans: "B" },
    // V11 → C
    { q: "What is a give-and-go?", opts: ["Passing and then setting a screen for the teammate you just passed to", "A defensive maneuver where the help defender takes the ball handler while the primary defender rotates away", "Passing to a teammate and immediately cutting to the basket to receive a return pass", "A play drawn in a timeout where the inbounder runs the ball after faking the pass"], ans: "C" },
    // V12 → D
    { q: "What does 'weak side' mean?", opts: ["The side of the court where your least effective offensive players are stationed", "The side of the court closest to the team's bench during a home game", "The side of the court where the defense is numerically outnumbered", "The side of the court opposite to where the ball currently is"], ans: "D" },
    // V13 → A
    { q: "What is a closeout?", opts: ["A defender sprinting to contest an open shooter while staying balanced enough not to foul", "The final two minutes of a game when a leading team protects its advantage", "A full-court press triggered after a made basket to apply immediate defensive pressure", "Two defenders collapsing simultaneously on the ball handler to force a turnover"], ans: "A" },
    // V14 → B
    { q: "What is the high post used for in offense?", opts: ["A stationary position used only to slow the pace and reset a stalled possession", "A player at the free throw line extended who creates scoring options and acts as the hub of the offense", "A designated receiving spot used only for inbound plays against half-court pressure", "A position a center holds to prevent backdoor cuts from the weakside wing"], ans: "B" },
    // V15 → C
    { q: "What does 'running a play off timeout' mean?", opts: ["Players use the timeout to recover stamina before returning to free-flowing offense", "The team switches to a zone defense for the first few possessions after the break", "The coach designs a specific play for the team to execute immediately when play resumes", "The best player on the floor signals their preferred play and teammates adjust around them"], ans: "C" },
    // V16 → D
    { q: "What is a defensive rotation?", opts: ["Substituting multiple defenders simultaneously to prevent fatigue in crunch time", "A team-wide switch from zone to man-to-man as the offense crosses halfcourt", "A scripted sequence where each defender rotates one spot clockwise each possession", "Defenders adjusting their positions in response to offensive movement to maintain proper coverage"], ans: "D" },
    // V17 → A
    { q: "What does 'penetrate and kick' mean?", opts: ["A ball handler driving into the paint to collapse the defense, then passing out to an open perimeter shooter", "Kicking the ball ahead to a sprinting teammate — a legal pass technique on the move", "A fast break where the lead guard drives until contact is drawn, then kicks to a trailing big", "A post entry where the big catches the ball and immediately kicks back to reset the offense"], ans: "A" },
    // V18 → B
    { q: "What is a 'hedge' in pick-and-roll defense?", opts: ["The big defender positioning behind the screen so the ball handler can freely turn the corner", "The big defender stepping up hard toward the ball handler after the screen to slow them while the on-ball defender recovers", "A zone adjustment where the center automatically shifts to cover every short roll", "A post double team where two defenders collapse once the screener catches the ball"], ans: "B" },
    // V19 → C
    { q: "What does 'playing off the ball' mean?", opts: ["Deliberately avoiding receiving the ball to give your teammates more room to operate", "A defensive concept where players without a ball assignment sag toward the paint to protect the rim", "The movement, cutting, screening, and positioning of players who do not currently have the ball", "Stationing your best shooters in the corners to stretch the defense and create driving lanes"], ans: "C" },
    // V20 → D
    { q: "What is a secondary break?", opts: ["The halftime intermission during which the coaching staff makes their primary adjustments", "A second timeout called right after the first to extend preparation before a final play", "A substitution pattern designed to keep fresh legs on the floor during the final two minutes", "After the initial fast break transition, the offense continues attacking quickly before the defense can fully set"], ans: "D" },
    // V21 → B
    { q: "What is a pick and fade compared to a pick and roll?", opts: ["There is no difference", "In a pick and fade the screener steps back toward the three point line after setting the screen instead of rolling to the basket", "A pick and fade is only used in zone offense", "The screener falls down"], ans: "B" },
    // V22 → B
    { q: "What does it mean to run early offense?", opts: ["Starting the game before scheduled time", "Pushing the pace immediately after gaining possession to attack before the defense is set", "Running a set play every possession", "Calling timeout quickly"], ans: "B" },
    // V23 → B
    { q: "What is a zone offense designed to do?", opts: ["Match up against man defense", "Create gaps and ball movement that exploits the spaces and rotations of a zone defense", "Speed up the game", "Isolate the best player"], ans: "B" },
    // V24 → B
    { q: "What is basketball IQ?", opts: ["A player's scoring average", "A player's ability to read the game make smart decisions and understand situations quickly", "A player's physical attributes", "A measure of how long a player has played"], ans: "B" },
    // V25 → B
    { q: "What does it mean to play with pace?", opts: ["Running as fast as possible", "Controlling the tempo deliberately choosing when to push and when to slow down to create advantages", "Always running a fast break", "Slowing the game down every possession"], ans: "B" },
    // V26 → B
    { q: "What is an offensive rebound putback?", opts: ["A defensive rebound", "When a player grabs their own team's missed shot and scores immediately", "A second free throw", "A shot off an inbound pass"], ans: "B" },
    // V27 → B
    { q: "What does weak side help mean in defense?", opts: ["The weakest defender helping", "A defender on the side away from the ball positioning to help if the ball handler beats their teammate", "A zone adjustment", "Switching assignments"], ans: "B" },
    // V28 → B
    { q: "What is a baseline drive?", opts: ["Driving toward halfcourt", "An offensive player attacking along the baseline toward the basket usually from the wing or corner", "A fast break", "A post move"], ans: "B" },
    // V29 → B
    { q: "What does it mean to deny the ball?", opts: ["Refusing to pass", "A defender actively positioning to prevent a pass from reaching their assigned offensive player", "Stealing the ball", "Blocking a shot"], ans: "B" },
    // V30 → B
    { q: "What is a pull up jumper?", opts: ["A shot taken while falling backward", "When a ball handler stops their dribble suddenly and rises to shoot a jump shot off the dribble", "A three point shot", "A free throw"], ans: "B" },
    // V31 → B
    { q: "What does it mean to play off two feet compared to one foot?", opts: ["Using both hands", "Jumping from two feet provides more power and control especially for contact finishes while one foot allows quicker release and more momentum", "There is no difference", "Two feet is only for dunking"], ans: "B" },
    // V32 → B
    { q: "What is a defensive breakdown?", opts: ["A halftime analysis", "When the defense fails to rotate correctly leaving an offensive player open due to miscommunication or missed assignment", "A timeout called by the defense", "Switching from zone to man"], ans: "B" },
    // V33 → B
    { q: "What does it mean to set good screens?", opts: ["Screening as many players as possible", "Setting a legal screen with a wide base and solid contact that actually frees up a teammate rather than a lazy or moving screen", "Screening only in the post", "Screening near halfcourt"], ans: "B" },
    // V34 → B
    { q: "What is a defensive stance?", opts: ["Standing straight up", "A low balanced position with feet wide knees bent and hands active that allows a defender to move quickly in any direction", "Crossing your arms", "Standing behind the offensive player"], ans: "B" },
    // V35 → B
    { q: "What does push the pace mean?", opts: ["Pushing another player", "Actively trying to advance the ball quickly and create fast break opportunities before the defense can set up", "Running a specific play", "Calling a quick timeout"], ans: "B" },
    // V36 → B
    { q: "What is a mid range shot?", opts: ["A three pointer", "A jump shot taken between the three point line and the paint area", "A free throw", "A layup"], ans: "B" },
    // V37 → B
    { q: "What does it mean to read the defense?", opts: ["Studying the opponent's jersey numbers", "Recognizing what the defense is doing and making the correct offensive decision based on what is available", "Calling a play", "Passing to the open player every time"], ans: "B" },
    // V38 → B
    { q: "What is a hockey assist in basketball?", opts: ["A penalty", "The pass made to the player who makes the pass that directly leads to a basket — two passes before the score", "A full court pass", "A no look pass"], ans: "B" },
    // V39 → B
    { q: "What does it mean to be a good teammate off the ball?", opts: ["Cheering loudly", "Moving with purpose setting screens communicating and positioning to create opportunities even when you do not have the ball", "Staying out of the way", "Standing in the corner"], ans: "B" },
    // V40 → B
    { q: "What is a late clock situation?", opts: ["When the game clock is broken", "When very little time remains on the shot clock or game clock requiring quick decisive offensive action", "The last quarter", "Overtime"], ans: "B" },
  ],
  elite: [
    // E1 → A
    { q: "In a 2-3 zone, there's a skip pass to the weak-side corner. Which defender contests?", opts: ["The weak-side wing, who is responsible for that corner in 2-3 zone coverage", "The weak-side guard, who drops from the perimeter to take the corner shooter", "The center, who slides across the lane to protect against the corner three", "The strong-side forward, who rotates across the lane once the ball moves"], ans: "A" },
    // E2 → B
    { q: "Advantage of a dribble hand-off over a pick and roll?", opts: ["It happens faster, giving the defense less time to communicate and switch", "The screener becomes a ball handler option after the hand-off, creating a guard-big mismatch that is harder to switch", "It requires less floor spacing, making it effective when the offense is crowded or contested", "The ball handler keeps their dribble alive longer, creating more time to read the defense"], ans: "B" },
    // E3 → C
    { q: "What is a horns set?", opts: ["A fast break alignment where two wings sprint ahead while the point guard follows with the ball", "A full-court press that funnels the ball handler to one side and doubles from behind", "Two bigs stationed at the elbows with guards in the corners, creating multiple simultaneous attack options", "An isolation set that clears one side of the floor for your best one-on-one scorer"], ans: "C" },
    // E4 → D
    { q: "Purpose of a DHO (dribble hand-off)?", opts: ["Slowing the pace and resetting the offense when the initial action hasn't created an opportunity", "Delivering the ball to a post player through a hand-off rather than a lob or bounce pass", "Running down the shot clock before initiating the primary play in the final seconds", "Creating a mismatched guard advantage by forcing the defense into a difficult switch-or-hedge decision"], ans: "D" },
    // E5 → A
    { q: "What is a scramble switch?", opts: ["An emergency defensive adjustment where players switch assignments after a screen has already broken normal coverage", "A practice drill that simulates chaotic transition situations to improve defensive communication", "An offensive set triggered by a hand signal when the primary action has been taken away by the defense", "A press break designed to handle a surprise full-court trap by scrambling to designated open spots"], ans: "A" },
    // E6 → B
    { q: "Why is shooting off the catch effective?", opts: ["There is no real advantage — it simply looks more athletic than a standard set shot", "It uses one continuous motion requiring less time to release, giving defenders less opportunity to close out and contest", "It is statistically more accurate than off-the-dribble shooting at every level of competition", "It is only effective on three-point attempts where the extra momentum adds the necessary range"], ans: "B" },
    // E7 → C
    { q: "'Playing the gaps' in zone defense means?", opts: ["Positioning just behind your zone responsibilities to take away skip passes to the corners", "Doubling the post player whenever the offense overloads a gap in the zone", "Positioning between offensive players to deny passing lanes and generate deflections", "Trapping the ball handler at the top of the key each time they enter the front of the zone"], ans: "C" },
    // E8 → D
    { q: "'Paint touches create offense' means?", opts: ["A fouling strategy targeting post players who are weak free throw shooters", "The post player should always look to shoot first and only kick out as a last resort", "Driving into the paint is primarily about drawing fouls rather than scoring at the rim", "Getting the ball into the paint forces the defense to collapse, opening up perimeter shooters"], ans: "D" },
    // E9 → A
    { q: "What is a flare screen?", opts: ["A screen set away from the ball that frees a shooter moving outward toward the three-point line or corner", "A screen set at halfcourt to free a ball handler coming off a pick near the logo", "A baseline screen where the cutter curls underneath the basket toward the near corner", "A post-up screen inside the paint designed to pin a smaller defender on a bigger offensive player"], ans: "A" },
    // E10 → B
    { q: "What does 'icing a pick-and-roll' mean?", opts: ["Freezing the ball handler by faking a double team to force them to pick up their dribble early", "The on-ball defender forces the ball handler away from the screen toward the sideline while the big protects the paint", "Double teaming the screener the moment the pick is set to eliminate the roll option entirely", "Switching every screen as a team to prevent the ball handler from turning the corner at all"], ans: "B" },
    // E11 → C
    { q: "What is a 'dunker spot'?", opts: ["The spot where the team's best finisher positions to receive alley-oop lob passes", "The low post position where a center backs down a defender for a power move to the rim", "A position inside the paint near the baseline opposite the ball, stretching the defense and creating lob or dump-off options", "The short corner area just inside the three-point line used for mid-range pull-up jumpers"], ans: "C" },
    // E12 → D
    { q: "What is 'chin action'?", opts: ["A defensive signal where the point guard taps their chin to call a half-court trapping scheme", "A fast break signal where the point guard taps their chin after a defensive rebound to push the pace", "A press break alignment where the ball handler calls the play by touching their chin to the defender", "The point guard dribbling toward the big at the elbow, triggering a series of cuts and screens for the rest of the offense"], ans: "D" },
    // E13 → A
    { q: "What is the 'nail position' in defense?", opts: ["The help defender positioned at the middle of the free throw line, ready to stop drives from either side", "The defender assigned to the opponent's best player and responsible for following them anywhere on the floor", "The most exposed positional assignment, typically given to the player who cannot guard on the perimeter", "A guard who drops into the post to protect against high-low passes when a big catches at the elbow"], ans: "A" },
    // E14 → B
    { q: "Difference between a pin-down screen and a curl cut?", opts: ["They are the same action — the difference is only whether the cutter is right-handed or left-handed", "A pin-down frees a player cutting from the baseline toward the ball; a curl means the cutter wraps around the screen and cuts toward the basket", "A pin-down is only used in zone offense to free a shooter; a curl is strictly a man-to-man concept", "A curl is a defensive technique for navigating through screens; a pin-down is the offensive counterpart"], ans: "B" },
    // E15 → C
    { q: "'Going under a screen' on defense means?", opts: ["Physically ducking under the screener's arms to maintain contact with the ball handler", "Switching assignments with a teammate as the ball handler uses the screen and rolling your man", "The defender passes behind the screener on the basket side, accepting space to prevent the ball handler from turning the corner", "Aggressively jumping to the level of the screen to take away the ball handler's downhill drive"], ans: "C" },
    // E16 → D
    { q: "What is a short roll?", opts: ["A screen set by a smaller, more mobile player specifically designed to confuse a bigger, slower defender", "A quick post entry pass to a big who immediately turns and shoots before the defense can react", "A fast break variation where the trailing big catches a skip pass and attacks off the dribble", "The screener stopping short in the paint after the pick, positioning as a secondary ball handler rather than rolling to the rim"], ans: "D" },
    // E17 → A
    { q: "What does 'early offense' mean?", opts: ["Pushing pace immediately after a made basket or defensive rebound, attacking before the opponent can get set", "Beginning offensive sets before the shot clock starts to get an early read on how the defense is aligned", "Running the specific first play of the game drawn up during pre-game preparation", "Calling a quick timeout to reset the offense before the defense can establish their coverage"], ans: "A" },
    // E18 → B
    { q: "What is a 'trip wire' in full-court pressure?", opts: ["A deliberate act where a defender uses their foot to disrupt a sprinting ball handler without detection", "A designated location where one defender forces the ball handler to stop or change direction, triggering a teammate to trap", "A zone defense alignment that funnels all ball movement to one side of the court with two stationary defenders", "A half-court trap that only activates when the ball is picked up near the sideline above the arc"], ans: "B" },
    // E19 → C
    { q: "What does 'spacing' mean and why does it matter?", opts: ["The physical distance between players on the bench during a timeout to allow the coach to walk and communicate freely", "How far each player stands from the three-point line to maximize their ability to catch and shoot", "Deliberately positioning offensive players to stretch the defense, creating driving lanes, post gaps, and passing angles", "Keeping all five players spread evenly across the halfcourt so no two teammates are within ten feet of each other"], ans: "C" },
    // E20 → D
    { q: "What is a ghost screen?", opts: ["A screen set so quickly and subtly that illegal contact goes undetected by the referee", "A screen set out of bounds to legally free a receiver on a sideline inbound play", "A screen set near halfcourt designed to free a cutter for a full-court lob pass to the rim", "A player fakes setting a screen and peels away — the ball handler attacks off the fake while the screener opens up as an immediate scoring option"], ans: "D" },
    // E21 → B
    { q: "What is a Spain pick and roll?", opts: ["A European fast break", "A play where a screener sets a back screen on the rolling big man's defender as they roll creating a layup opportunity", "A defensive scheme", "A press break"], ans: "B" },
    // E22 → B
    { q: "What does it mean to play the level of the screen?", opts: ["Matching the height of the screener", "A defensive technique where the on ball defender fights over the screen at exactly the height it is set rather than going under or dramatically over it", "Setting a screen at a specific spot", "Hedging hard on every screen"], ans: "B" },
    // E23 → B
    { q: "What is a drop coverage in pick and roll defense?", opts: ["Dropping the ball", "The big defender drops back toward the paint allowing the ball handler a mid range shot while protecting against the roll and drive", "A full zone", "Switching every screen"], ans: "B" },
    // E24 → B
    { q: "What does it mean to play the three quarter deny?", opts: ["Denying three point shots only", "A defensive position three quarters of the way between the defender's player and the ball actively working to deny the pass while staying close enough to recover", "A zone adjustment", "Playing behind the offensive player"], ans: "B" },
    // E25 → B
    { q: "What is a pistol action in basketball offense?", opts: ["A fast aggressive style", "A two man action combining a dribble hand off with a pick and roll that can be initiated from various spots", "A full court press", "An isolation play"], ans: "B" },
    // E26 → B
    { q: "What does loading the leg mean for a shooter?", opts: ["Getting tired", "The slight downward dip or gathering motion a shooter uses before rising that generates power and rhythm", "A shooting foul", "Standing on one leg"], ans: "B" },
    // E27 → B
    { q: "What is a floppy action?", opts: ["Playing without energy", "An off ball action where a player cuts off staggered screens on either side of the lane and can go either direction keeping the defense guessing", "A post entry", "A transition play"], ans: "B" },
    // E28 → B
    { q: "What does it mean to play downhill?", opts: ["Playing on a sloped court", "Attacking aggressively toward the basket using speed and momentum rather than resetting or pulling back", "A defensive technique", "Slowing the game down"], ans: "B" },
    // E29 → B
    { q: "What is a blocker mover offense?", opts: ["A physical style", "A system where some players set screens as blockers while others use those screens as movers to get open shots", "A fast break system", "An isolation offense"], ans: "B" },
    // E30 → B
    { q: "What does it mean to play with a high motor?", opts: ["Running fast breaks only", "Playing with relentless effort on every possession never taking plays off and consistently going hard for loose balls rebounds and stops", "Playing physically", "Shooting quickly"], ans: "B" },
    // E31 → B
    { q: "What is a read and react offense?", opts: ["Reading the coach's signals", "A system where players react to what each pass or action triggers rather than running set plays making it adaptable against any defense", "A fast break system", "An isolation offense"], ans: "B" },
    // E32 → B
    { q: "What does shot selection mean and why does it matter?", opts: ["Choosing which player shoots", "The discipline of only taking shots that are high percentage and within your skill set rather than forcing difficult shots", "Shooting as often as possible", "Only taking three pointers"], ans: "B" },
    // E33 → B
    { q: "What is a zone buster offense?", opts: ["An aggressive offense", "Specific principles designed to attack zones including skip passes high low passing baseline cuts and placing shooters in the gaps", "A fast break offense", "A stall offense"], ans: "B" },
    // E34 → B
    { q: "What does it mean to be a connector player?", opts: ["A player who connects passes", "A versatile player who can play multiple positions and connect different parts of the offense making them valuable in multiple lineups", "A point guard only role", "A defensive specialist"], ans: "B" },
    // E35 → B
    { q: "What is a secondary break in transition?", opts: ["A halftime break", "After the initial fast break the offense continues pushing pace with structured actions including a trailer for a three point shot", "A timeout play", "A set half court play"], ans: "B" },
    // E36 → B
    { q: "What does it mean to take what the defense gives you?", opts: ["Stealing the ball", "Making smart decisions based on how the defense is positioned rather than forcing predetermined actions — drive if they give the drive shoot if they give the three", "Playing aggressively", "Running set plays regardless"], ans: "B" },
    // E37 → B
    { q: "What is a defensive anchor and what makes someone effective in that role?", opts: ["The slowest defender", "The last line of defense typically a big who communicates switches protects the rim and organizes the defense combining size awareness and vocal leadership", "The most physical player", "The player guarding the point guard"], ans: "B" },
    // E38 → B
    { q: "What does it mean to play with purpose off the ball?", opts: ["Running randomly", "Every movement has intention — cutting at the right time setting useful screens positioning in spaces that stress the defense and being ready to shoot immediately on receiving a pass", "Standing in the corner waiting", "Following the ball handler everywhere"], ans: "B" },
    // E39 → B
    { q: "What is a defensive shell drill and what does it teach?", opts: ["A shooting drill", "A foundational drill where players practice positioning help rotations and communication against offensive movement teaching principles of team defense", "A one on one drill", "A conditioning drill"], ans: "B" },
    // E40 → B
    { q: "What does it mean when a coach says trust the process?", opts: ["Following a specific play", "Believing that consistent effort correct habits and team principles produce results over time even when immediate results are not visible", "Running the same play every time", "Listening to the coach always"], ans: "B" },
  ],
};

const DIFF_META: Record<Difficulty, { label: string; color: string; bg: string; ring: string; tagline: string; pts: number }> = {
  rookie:  { label: "ROOKIE",  color: "#4ade80", bg: "rgba(74,222,128,0.1)",  ring: "rgba(74,222,128,0.4)",  tagline: "Learn the fundamentals",           pts: 10 },
  varsity: { label: "VARSITY", color: "#fb923c", bg: "rgba(251,146,60,0.1)",  ring: "rgba(251,146,60,0.4)",  tagline: "Prove your court sense",            pts: 20 },
  elite:   { label: "ELITE",   color: "#c084fc", bg: "rgba(192,132,252,0.1)", ring: "rgba(192,132,252,0.4)", tagline: "Separate yourself from the field",  pts: 35 },
};

const LABELS: [AnswerKey, string][] = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]];
const DAILY_SESSION_LIMIT = 5;
const COOLDOWN_SECONDS = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPerformance(score: number, diff: Difficulty): string {
  if (diff === "rookie") {
    if (score === 10) return "Perfect Rookie!";
    if (score >= 8)  return "Strong Foundation";
    if (score >= 6)  return "Getting There";
    return "Keep Studying";
  }
  if (diff === "varsity") {
    if (score === 10) return "Varsity Captain";
    if (score >= 8)  return "High IQ Player";
    if (score >= 6)  return "Good Court Sense";
    return "Keep Grinding";
  }
  if (score === 10) return "Elite Basketball Mind";
  if (score >= 8)  return "Scout-Level Vision";
  if (score >= 6)  return "Advanced IQ";
  return "Back to the Film Room";
}

function getBallKnowledgeLevel(pts: number): string {
  if (pts >= 800) return "Elite Playmaker";
  if (pts >= 500) return "High Basketball IQ";
  if (pts >= 250) return "Varsity Vision";
  if (pts >= 100) return "Court Aware";
  if (pts >= 1)   return "Rookie IQ";
  return "none";
}

function getLevelColor(level: string): string {
  if (level === "Elite Playmaker")    return "#c084fc";
  if (level === "High Basketball IQ") return "#fb923c";
  if (level === "Varsity Vision")     return "#60a5fa";
  if (level === "Court Aware")        return "#4ade80";
  return "#94a3b8";
}

const TIMER_SECS = 20;
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type DailyStatus = {
  sessionsByDifficulty: Record<string, number>;
  cooldownByDifficulty?: Record<string, number>;
};

type SessionResponse = {
  success: boolean;
  pointsEarned: number;
  deduped: number;
  totalPoints: number;
  level: string;
  reason: string | null;
  sessionsToday: number;
  dailySessionsLeft: number;
  locked: boolean;
  cooldownSecondsLeft?: number;
};

export function IsoBallPage() {
  const { isSignedIn, user } = useUser();
  const qc = useQueryClient();

  const [screen, setScreen] = useState<"landing" | "quiz" | "results">("landing");
  const [difficulty, setDifficulty] = useState<Difficulty>("rookie");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [originalIndices, setOriginalIndices] = useState<number[]>([]);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionPtsEarned, setSessionPtsEarned] = useState<number | null>(null);
  const [sessionDeduped, setSessionDeduped] = useState<number | null>(null);
  const [sessionReason, setSessionReason] = useState<string | null>(null);
  const [newTotalPoints, setNewTotalPoints] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  const [dailyStatus, setDailyStatus] = useState<Record<string, number>>({ rookie: 0, varsity: 0, elite: 0 });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [cooldownByDiff, setCooldownByDiff] = useState<Record<Difficulty, number>>({ rookie: 0, varsity: 0, elite: 0 });
  const cooldownRefs = useRef<Record<Difficulty, ReturnType<typeof setInterval> | null>>({ rookie: null, varsity: null, elite: null });

  const { data: leaderboard, isLoading: lbLoading } = useGetIsoBallLeaderboard();

  function startDiffCooldown(diff: Difficulty, seconds: number) {
    if (cooldownRefs.current[diff]) clearInterval(cooldownRefs.current[diff]!);
    const rounded = Math.ceil(seconds);
    if (rounded <= 0) return;
    setCooldownByDiff((prev) => ({ ...prev, [diff]: rounded }));
    cooldownRefs.current[diff] = setInterval(() => {
      setCooldownByDiff((prev) => {
        const t = prev[diff];
        if (t <= 1) {
          clearInterval(cooldownRefs.current[diff]!);
          cooldownRefs.current[diff] = null;
          return { ...prev, [diff]: 0 };
        }
        return { ...prev, [diff]: t - 1 };
      });
    }, 1000);
  }

  // Fetch daily status for signed-in users on mount
  useEffect(() => {
    if (!isSignedIn) { setStatusLoaded(true); return; }
    fetch(`${BASE_URL}/api/iso-ball/daily-status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: DailyStatus) => {
        setDailyStatus(data.sessionsByDifficulty);
        if (data.cooldownByDifficulty) {
          (["rookie", "varsity", "elite"] as Difficulty[]).forEach((d) => {
            const secs = data.cooldownByDifficulty?.[d] ?? 0;
            if (secs > 0) startDiffCooldown(d, secs);
          });
        }
        setStatusLoaded(true);
      })
      .catch(() => setStatusLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const advance = useCallback((wasCorrect: boolean) => {
    stopTimer();
    const newStreak = wasCorrect ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);
    setStreak(newStreak);
    setBestStreak(newBest);
    if (wasCorrect) {
      setCorrect((c) => c + 1);
      setCorrectIndices((ci) => [...ci, originalIndices[qIndex]]);
    }

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setScreen("results");
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnswered(false);
        setTimeLeft(TIMER_SECS);
      }
    }, 900);
  }, [qIndex, questions.length, streak, bestStreak, stopTimer, originalIndices]);

  const handleAnswer = useCallback((key: AnswerKey) => {
    if (answered) return;
    setAnswered(true);
    setSelected(key);
    advance(key === questions[qIndex].ans);
  }, [answered, questions, qIndex, advance]);

  useEffect(() => {
    if (screen !== "quiz" || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { advance(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [screen, qIndex, answered, advance, stopTimer]);

  // Submit session when results screen shows
  useEffect(() => {
    if (screen !== "results" || !isSignedIn) return;

    // Start per-difficulty cooldown immediately when results appear
    startDiffCooldown(difficulty, COOLDOWN_SECONDS);

    let cancelled = false;
    async function save() {
      try {
        const res = await fetch(`${BASE_URL}/api/iso-ball/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ difficulty, correctQuestionIndices: correctIndices }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json() as SessionResponse;

        // Always invalidate cache — safe to call even if component has unmounted
        qc.invalidateQueries({ queryKey: ["isoBallLeaderboard"] });
        qc.invalidateQueries({ queryKey: ["isoBallProfile", user?.id] });

        if (cancelled) return; // Only skip state updates on unmounted component

        setSessionPtsEarned(data.pointsEarned);
        setSessionDeduped(data.deduped ?? 0);
        setSessionReason(data.reason);
        setNewTotalPoints(data.totalPoints);
        setNewLevel(data.level);
        setSessionSaved(true);
        setDailyStatus((prev) => ({
          ...prev,
          [difficulty]: data.sessionsToday ?? (prev[difficulty] + 1),
        }));
        // Sync server cooldown if it differs from client estimate
        if (data.reason === "cooldown" && data.cooldownSecondsLeft) {
          startDiffCooldown(difficulty, data.cooldownSecondsLeft);
        }
      } catch {
        if (!cancelled) setSaveError(true);
      }
    }
    save();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function startQuiz(diff: Difficulty) {
    const pool = QUESTIONS[diff].map((q, i) => ({ q, origIdx: i }));
    const shuffled = shuffle(pool).slice(0, 10);
    setDifficulty(diff);
    setQuestions(shuffled.map((x) => x.q));
    setOriginalIndices(shuffled.map((x) => x.origIdx));
    setCorrectIndices([]);
    setQIndex(0);
    setSelected(null);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setAnswered(false);
    setTimeLeft(TIMER_SECS);
    setSessionSaved(false);
    setSessionPtsEarned(null);
    setSessionDeduped(null);
    setSessionReason(null);
    setNewTotalPoints(null);
    setNewLevel(null);
    setSaveError(false);
    setScreen("quiz");
  }

  function goLanding() {
    stopTimer();
    setScreen("landing");
  }

  const meta = DIFF_META[difficulty];
  const timerPct = (timeLeft / TIMER_SECS) * 100;
  const timerColor = timeLeft > 8 ? "#4ade80" : timeLeft > 4 ? "#fb923c" : "#f87171";

  // ── Landing ──────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-2">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight" style={{ fontFamily: "'Anton', sans-serif" }}>
            Iso Ball
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Test your basketball IQ. Three levels. Ten questions. How deep is your knowledge?
          </p>
          {!isSignedIn && (
            <p className="text-xs text-muted-foreground/70">
              <a href={`${BASE_URL}/sign-in`} className="underline text-primary/70 hover:text-primary">Sign in</a> to save your score and appear on The Playbook.
            </p>
          )}
        </div>

        {/* Difficulty cards */}
        <div className="grid gap-4">
          {(["rookie", "varsity", "elite"] as Difficulty[]).map((diff) => {
            const m = DIFF_META[diff];
            const sessionsToday = dailyStatus[diff] ?? 0;
            const isLocked = isSignedIn && statusLoaded && sessionsToday >= DAILY_SESSION_LIMIT;
            const diffCooldown = isSignedIn ? (cooldownByDiff[diff] ?? 0) : 0;

            return (
              <div key={diff} className="relative">
                <button
                  onClick={() => !isLocked && startQuiz(diff)}
                  disabled={isLocked}
                  className="w-full text-left rounded-2xl p-5 border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: m.bg, borderColor: isLocked ? "rgba(255,255,255,0.08)" : m.ring }}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xl font-black uppercase tracking-wider flex items-center gap-2" style={{ color: isLocked ? "rgba(255,255,255,0.35)" : m.color, fontFamily: "'Anton', sans-serif" }}>
                        {m.label}
                        {isLocked && <Lock className="h-4 w-4" />}
                      </div>
                      {isLocked ? (
                        <div className="text-sm font-semibold text-muted-foreground/70">
                          Come back tomorrow to keep earning
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">{m.tagline}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isLocked ? (
                        <div className="text-xs text-muted-foreground/50 font-semibold">
                          {sessionsToday}/{DAILY_SESSION_LIMIT} sessions
                        </div>
                      ) : diffCooldown > 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <Timer className="h-3.5 w-3.5" /> {diffCooldown}s
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: m.color }}>
                          Play <Zap className="h-4 w-4" />
                        </div>
                      )}
                      {!isLocked && (
                        <span className="text-xs text-muted-foreground">{m.pts} pts/correct</span>
                      )}
                      {isSignedIn && !isLocked && statusLoaded && sessionsToday > 0 && (
                        <span className="text-xs text-muted-foreground/50">{sessionsToday}/{DAILY_SESSION_LIMIT} today</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Daily earning note */}
        <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <Info className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            Ball Knowledge points are earned once per question per day — come back daily to keep climbing.
          </p>
        </div>

        {/* The Playbook Leaderboard */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-white/4 border-b border-white/8">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-black text-sm uppercase tracking-widest text-foreground">The Playbook</h2>
              <p className="text-xs text-muted-foreground">Who Knows The Game</p>
            </div>
          </div>

          {lbLoading ? (
            <div className="divide-y divide-white/6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                  <div className="w-6 h-4 bg-muted/30 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted/30 rounded w-32" />
                    <div className="h-2.5 bg-muted/20 rounded w-20" />
                  </div>
                  <div className="h-3 bg-muted/30 rounded w-16" />
                </div>
              ))}
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              No players on the board yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {leaderboard.slice(0, 10).map((entry) => {
                const levelColor = getLevelColor(entry.level);
                const isElite = entry.level === "Elite Playmaker";
                const isMe = isSignedIn && user?.id === entry.clerkUserId;
                return (
                  <div
                    key={entry.clerkUserId}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isMe ? "bg-primary/8" : ""}`}
                  >
                    <span className={`text-sm font-black w-6 text-center tabular-nums ${entry.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {entry.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                          {entry.firstName} {entry.lastName}
                          {isMe && <span className="text-xs text-primary/70 font-medium ml-1">(you)</span>}
                        </p>
                        {isElite && (
                          <Medal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#c084fc" }} />
                        )}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: levelColor }}>{entry.level}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black tabular-nums text-foreground">{entry.totalPoints.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{entry.sessions} {entry.sessions === 1 ? "session" : "sessions"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  if (screen === "quiz") {
    const q = questions[qIndex];
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={goLanding} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-sm font-semibold text-muted-foreground">{qIndex + 1} / {questions.length}</span>
            <div className="flex items-center gap-1 text-xs font-bold text-primary">
              <Trophy className="h-3.5 w-3.5" /> {correct}
            </div>
            {streak >= 2 && (
              <div className="flex items-center gap-1 text-xs font-bold text-orange-400">
                <Zap className="h-3.5 w-3.5" /> {streak}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" /> Timer
            </div>
            <span className="font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${timerPct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 p-6">
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-3">Question {qIndex + 1}</p>
          <p className="text-lg font-bold leading-snug">{q.q}</p>
        </div>

        <div className="grid gap-3">
          {LABELS.map(([key], i) => {
            const optText = q.opts[i];
            const isCorrect = key === q.ans;
            const isSelected = key === selected;

            let bg = "rgba(255,255,255,0.04)";
            let border = "rgba(255,255,255,0.1)";
            let textColor = "inherit";

            if (answered) {
              if (isCorrect) { bg = "rgba(74,222,128,0.15)"; border = "rgba(74,222,128,0.5)"; textColor = "#4ade80"; }
              else if (isSelected && !isCorrect) { bg = "rgba(248,113,113,0.15)"; border = "rgba(248,113,113,0.5)"; textColor = "#f87171"; }
            }

            return (
              <button
                key={key}
                disabled={answered}
                onClick={() => handleAnswer(key)}
                className="w-full text-left rounded-xl px-5 py-4 border transition-all hover:bg-white/8 disabled:cursor-default flex items-center gap-4"
                style={{ background: bg, borderColor: border, color: textColor }}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border" style={{ borderColor: border, color: textColor }}>
                  {key}
                </span>
                <span className="text-sm font-semibold">{optText}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const pct = Math.round((correct / 10) * 100);
  const perfLabel = getPerformance(correct, difficulty);
  const ringColor = correct >= 8 ? "#4ade80" : correct >= 6 ? "#fb923c" : "#f87171";
  const pointsEarnedThisSession = correct * DIFF_META[difficulty].pts;
  const diffCooldownLeft = isSignedIn ? (cooldownByDiff[difficulty] ?? 0) : 0;
  const isOnCooldown = diffCooldownLeft > 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8 text-center">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label} · Results</p>
        <h2 className="text-3xl font-black uppercase tracking-tight" style={{ fontFamily: "'Anton', sans-serif" }}>{perfLabel}</h2>
      </div>

      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={ringColor} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tabular-nums" style={{ color: ringColor }}>{correct}</span>
            <span className="text-sm text-muted-foreground font-semibold">/ 10</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/4 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accuracy</p>
          <p className="text-2xl font-black">{pct}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/4 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Best Streak</p>
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="h-5 w-5 text-orange-400" />
            <p className="text-2xl font-black">{bestStreak}</p>
          </div>
        </div>
      </div>

      {/* Ball Knowledge points earned */}
      {isSignedIn ? (
        <div
          className="rounded-xl border p-5 space-y-2 text-left"
          style={{
            borderColor: sessionSaved && !sessionReason ? "rgba(192,132,252,0.4)" : "rgba(255,255,255,0.08)",
            background: sessionSaved && !sessionReason ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.04)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c084fc" }}>Ball Knowledge</p>

          {sessionSaved ? (
            <>
              {sessionReason === "daily_limit" ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  Daily session limit reached — no points awarded. Come back tomorrow.
                </p>
              ) : sessionReason === "cooldown" ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  Played too quickly — no points awarded. Wait for the cooldown before replaying.
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-black" style={{ color: "#c084fc" }}>
                      +{sessionPtsEarned} pts
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">saved to your profile</span>
                  </div>
                  {(sessionDeduped ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground/70">
                      {sessionDeduped} question{sessionDeduped === 1 ? "" : "s"} already earned today — {sessionDeduped! * DIFF_META[difficulty].pts} pts skipped
                    </p>
                  )}
                  {newTotalPoints !== null && newLevel && (
                    <div className="mt-1 pt-2 border-t border-white/8 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">New total</span>
                      <span className="text-base font-black tabular-nums">
                        {newTotalPoints.toLocaleString()} pts
                        {" "}
                        <span className="text-sm font-bold" style={{ color: getLevelColor(newLevel) }}>· {newLevel}</span>
                      </span>
                    </div>
                  )}
                  {newLevel === "Elite Playmaker" && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Medal className="h-4 w-4" style={{ color: "#c084fc" }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c084fc" }}>The Playbook Stamp Earned</span>
                    </div>
                  )}
                </>
              )}
            </>
          ) : saveError ? (
            <p className="text-xs text-muted-foreground">Could not save score — try again later.</p>
          ) : (
            <p className="text-xs text-muted-foreground animate-pulse">Saving +{pointsEarnedThisSession} pts…</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ball Knowledge</p>
          <p className="text-sm text-muted-foreground">
            <a href={`${BASE_URL}/sign-in`} className="text-primary underline font-semibold">Sign in</a> to save your score and earn a spot on The Playbook.
          </p>
          <p className="text-xs text-muted-foreground/60">You would have earned +{pointsEarnedThisSession} pts this session.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => startQuiz(difficulty)}
          disabled={isOnCooldown}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOnCooldown ? (
            <>
              <Timer className="h-4 w-4" />
              Next {meta.label} play in {diffCooldownLeft}s
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" /> Play Again — {meta.label}
            </>
          )}
        </button>
        <button
          onClick={goLanding}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/12 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/6 active:scale-95 transition-all"
        >
          Change Difficulty
        </button>
      </div>
    </div>
  );
}

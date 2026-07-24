import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, ChevronLeft, RotateCcw, Zap, Trophy, Timer, BookOpen, Medal, Lock, Info } from "lucide-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIsoBallLeaderboard, customFetch } from "@workspace/api-client-react";

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
    { q: "In the NBA, how many seconds does a team have to advance the ball past halfcourt?", opts: ["8", "5", "15", "10"], ans: "A" },
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
    { q: "What is a free throw?", opts: ["An unguarded shot taken from midcourt when a player is fouled while in transition", "An uncontested shot from the free throw line awarded after certain fouls", "An uncontested shot given after time expires if the trailing team is fouled on the buzzer", "A special shot awarded to the offense when the defense commits five consecutive fouls"], ans: "B" },
    // Q22 → A
    { q: "What does it mean when a referee signals with both arms crossed above their head?", opts: ["Game over", "Jump ball", "Timeout", "Technical foul"], ans: "A" },
    // Q23 → C
    { q: "How many timeouts does each team typically get per game in youth basketball?", opts: ["2", "3", "5", "1"], ans: "C" },
    // Q24 → B
    { q: "What is a slam dunk?", opts: ["When a player catches a lob pass above the rim and guides the ball into the basket with both hands", "When a player jumps and throws the ball directly through the hoop from above", "When a player leaps from inside the paint and banks the ball off the backboard at full speed", "When a player grabs an offensive rebound above the rim and forces the ball downward into the net"], ans: "B" },
    // Q25 → B
    { q: "What does it mean to be called for a carry or palm?", opts: ["When a player switches their dribbling hand between their legs without the ball touching the floor", "When a player turns their hand under the ball while dribbling stopping the balls momentum", "When a player pounds the dribble so hard the ball bounces up past shoulder height on the return", "When a player uses their forearm to redirect the ball forward while dribbling at full speed"], ans: "B" },
    // Q26 → B
    { q: "What is the purpose of the three point line?", opts: ["To indicate where the court boundaries end and the out of bounds area along each sideline begins", "To separate shots worth two points from shots worth three points", "To show players the exact distance required when lining up for free throw lane positions", "To identify the midcourt division between each team's frontcourt and their backcourt"], ans: "B" },
    // Q27 → B
    { q: "What does it mean when a player is called for a lane violation on a free throw?", opts: ["They crossed the free throw line with their foot before fully releasing the ball on their shot", "They entered the lane too early before the ball hits the rim", "They caught the ball inside the lane and dribbled before attempting the free throw", "They took more than five dribbles at the line before releasing their free throw attempt"], ans: "B" },
    // Q28 → B
    { q: "What is a no look pass?", opts: ["A pass delivered behind the passer's back by swinging the arm in a reverse circular motion", "A pass where the passer looks in a different direction from where they are throwing to fool the defense", "A pass that skips off the floor at an angle to reach a teammate through a tight defensive gap", "A high arcing pass thrown over a defender's head to a cutting teammate near the basket"], ans: "B" },
    // Q29 → B
    { q: "What does it mean to set a screen?", opts: ["When a defender jumps in front of a driving player with legal position to draw an offensive foul", "When an offensive player legally stands in the path of a defender to free up a teammate", "When a coach calls a dead ball to put a specific offensive formation in place before resuming play", "When two defenders trade assignments on the fly to neutralize an offensive player's movement"], ans: "B" },
    // Q30 → C
    { q: "What is a point guard typically responsible for?", opts: ["Posting up near the basket and converting high percentage shots in the paint on most possessions", "Camping near the offensive glass and fighting for every rebound on each missed shot attempt", "Running the offense directing the team and handling the ball", "Guarding the opposing team's tallest and strongest player near the basket on defense"], ans: "C" },
    // Q31 → B
    { q: "What happens when the ball goes out of bounds?", opts: ["The team whose player caused the ball to go out is awarded one free throw before resuming play", "The team that did not touch the ball last gets possession and inbounds the ball", "The referee calls a dead ball and both teams reset to their starting positions before a jump ball", "The player responsible for the ball going out is assessed a personal foul on the spot"], ans: "B" },
    // Q32 → B
    { q: "What is a layup?", opts: ["A shot released from beyond halfcourt using a two handed overhead throw toward the rim", "A close range shot where a player uses the backboard or lays the ball up toward the basket off one foot", "A one handed overhead throw from directly below the basket while fully airborne", "A shot taken from directly in front of the basket with both feet planted on the free throw line"], ans: "B" },
    // Q33 → B
    { q: "What does the term paint refer to in basketball?", opts: ["The tinted section at the outer edge of each sideline that marks the team bench area", "The rectangular key area in front of the basket", "The curved line that separates two point scoring territory from three point scoring territory", "The line running across the middle of the court that divides the two teams' frontcourts"], ans: "B" },
    // Q34 → B
    { q: "What is a buzzer beater?", opts: ["A shot attempt that ricochets loudly off the backboard just before the buzzer sounds at quarter's end", "A shot made just as the game clock or shot clock expires", "A heave thrown from halfcourt to end a half when a team trails by three points or fewer", "A free throw attempt converted successfully with no time remaining on the game clock"], ans: "B" },
    // Q35 → B
    { q: "What does it mean to be called for a backcourt violation?", opts: ["When a player shoves an opponent from behind while both are sprinting toward the basket in transition", "When a team advances the ball past halfcourt then passes it back across the halfcourt line", "When a player catches a pass while standing with one foot touching the sideline or baseline", "When the offense fails to inbound the ball within the required five second time limit"], ans: "B" },
    // Q36 → C
    { q: "What is a shooting guard typically known for?", opts: ["Distributing the ball from the top of the key and controlling the tempo of the offense", "Defending the opposing big man and battling for rebounds on the glass every possession", "Scoring from the perimeter and off the catch", "Setting back screens for cutters and posting up on the weak side to stretch the defense"], ans: "C" },
    // Q37 → B
    { q: "What does it mean to crash the boards?", opts: ["Barreling into a stationary defender while driving to the basket and initiating heavy contact", "Aggressively pursuing rebounds after a shot", "Attacking the lane with speed and force by dropping a shoulder toward the basket", "Planting yourself in front of a driving player and using your body to draw an offensive foul"], ans: "B" },
    // Q38 → C
    { q: "What is a power forward typically responsible for?", opts: ["Pushing the pace off rebounds and directing the offense from the top of the key each possession", "Spotting up behind the arc and knocking down open three pointers off kick out passes", "Physical play near the basket rebounding and defending bigger players", "Running the full length of the court on every possession to pressure the opposing ball handler"], ans: "C" },
    // Q39 → B
    { q: "What does it mean when a team is in the bonus?", opts: ["They have extended their lead past twenty points qualifying for mercy rule free throw protection", "They have accumulated enough team fouls that the other team shoots free throws on every foul", "They have converted a rare three point play that carries a bonus free throw multiplier", "They have saved all their timeouts to use as strategic shot clock resets in the final quarter"], ans: "B" },
    // Q40 → C
    { q: "What is a center typically responsible for?", opts: ["Pushing the ball up the court after each defensive rebound and calling plays from halfcourt", "Stretching the defense by spotting up behind the arc and drawing closeouts from opposing bigs", "Protecting the rim rebounding and scoring near the basket", "Pressing the opposing ball handler at halfcourt and disrupting the offense with full court pressure"], ans: "C" },
    { q: "Who invented the sport of basketball?", opts: ["George Mikan", "James Naismith", "John Wooden", "Bob Cousy"], ans: "B" },
    { q: "How high is a regulation basketball hoop from the floor?", opts: ["8 feet", "9 feet", "10 feet", "11 feet"], ans: "C" },
    { q: "What does NBA stand for?", opts: ["National Basketball Association", "North American Basketball Association", "National Basketball Academy", "National Basketball Athletics"], ans: "A" },
    { q: "How many quarters are in a regulation NBA game?", opts: ["2", "3", "5", "4"], ans: "D" },
    { q: "How many minutes is each quarter in an NBA game?", opts: ["12", "10", "15", "8"], ans: "A" },
    { q: "What is an air ball?", opts: ["A shot that hits only the backboard without touching the rim", "A shot that bounces high off the back of the rim", "A shot that misses the basket, rim, and backboard entirely", "A long pass that floats through the air before a teammate catches it"], ans: "C" },
    { q: "What does 'swish' mean?", opts: ["A dribble move where the ball is swiped between the legs", "A shot that goes cleanly through the net without touching the rim or backboard", "A defensive technique for swiping the ball from a dribbler's hand", "A quick crossover dribble used to lose a chasing defender"], ans: "B" },
    { q: "What is a steal?", opts: ["When an offensive player creates a mismatch before the defense adjusts", "When a player picks up their dribble before a screen arrives", "When a team commits fouls intentionally to stop the clock", "When a defender legally takes the ball away from an offensive player while they dribble or pass"], ans: "D" },
    { q: "What is a blocked shot?", opts: ["A defender legally deflecting or rejecting a shot before or as it leaves the shooter's hand", "A technical foul for grabbing a shooter's arm during their shot attempt", "When a shooter collides with a stationary defender and the shooter is called for the foul", "A defender swatting the ball after it has fully left the shooter's hand"], ans: "A" },
    { q: "What is the halfcourt line?", opts: ["The arc near each basket that marks the restricted area for charging calls", "The curved line separating two-point shots from three-point shots around the perimeter", "The line that divides the court into two equal halves separating each team's frontcourt from their backcourt", "The line across the lane just above the free throw line marking the high post area"], ans: "C" },
    { q: "What is a triple-double?", opts: ["When a player scores three times in a row without the other team scoring", "A game in which a single player records at least 10 in three different statistical categories", "When a team makes three consecutive three-point shots in one possession", "Scoring three separate baskets worth three points each in the final quarter"], ans: "B" },
    { q: "What is a jump shot?", opts: ["A shot released at or near the peak of a player's jump guided by one hand", "A two-handed shot taken with both feet planted firmly on the floor at the free throw line", "A layup taken off a running start where the player leaps from one foot near the basket", "A full-court heave launched with both hands from above the head"], ans: "A" },
    { q: "What is a bank shot?", opts: ["A shot taken from beyond the arc using a running start toward the baseline", "A shot released while falling backward away from the basket", "A short hook shot taken with the non-dominant hand from directly under the rim", "A shot intentionally aimed at the backboard so the ball bounces off it and into the basket"], ans: "D" },
    { q: "What is overtime in basketball?", opts: ["A penalty added when a team commits more than five fouls in a single quarter", "The final two minutes of regulation when clock management rules change", "An extra period played when the game is tied at the end of regulation", "An extended halftime granted when neither team has scored in the first eight minutes"], ans: "C" },
    { q: "What is a field goal in basketball?", opts: ["A free throw that counts as one point instead of the standard two", "Any basket scored during live play worth two or three points depending on where it was shot from", "The opening possession equivalent in basketball where a team starts from their own baseline", "A special scoring play worth four points available only in the final 30 seconds"], ans: "B" },
    { q: "What is a small forward typically known for?", opts: ["Versatility — scoring both inside and outside while guarding multiple positions", "Camping under the basket for rebounds and never venturing beyond the three-point line", "Bringing the ball up the court and calling plays from the top of the key", "Setting physical screens in the low post to free up cutters"], ans: "A" },
    { q: "What does 'PPG' stand for in basketball statistics?", opts: ["Points Per Game total earned over a career", "Player Performance Grade given by coaching staff", "Points Per Game average for the season", "Potential Points Generated per possession"], ans: "C" },
    { q: "How does play begin at the start of a basketball game?", opts: ["The home team automatically receives the ball first as a home court advantage", "A referee tosses the ball into the air between one player from each team who jump to tip it — called a jump ball or tip-off", "Each team's captain shoots a free throw and the team that makes it receives first possession", "The visiting team always gets the ball first to compensate for home court disadvantage"], ans: "B" },
    { q: "What is a technical foul?", opts: ["A foul for excessive force on a player driving to the basket", "A foul for charging directly into a stationary defender", "A foul called any time a defender reaches in on a dribbling player's arm", "A foul called for unsportsmanlike conduct, arguing with officials, or violating administrative rules"], ans: "D" },
    { q: "What are the five traditional basketball positions?", opts: ["Point guard, shooting guard, small forward, power forward, and center", "Lead guard, wing, forward, big, and stretch four", "Scorer, passer, rebounder, defender, and shot blocker", "Primary ball handler, off guard, wing forward, post player, and rim protector"], ans: "A" },
    { q: "What is a hook shot?", opts: ["A shot where the player grabs the ball mid-flight and redirects it toward the basket", "A foul called when a defender hooks an offensive player's arm during a shooting motion", "A one-handed shot released in a sweeping arc overhead, often used by post players near the basket", "A quick wrist flick from close range where only the fingertips guide the ball over a defender's hand"], ans: "C" },
    { q: "How many seconds does a player have to inbound the ball?", opts: ["3 seconds", "5 seconds", "8 seconds", "10 seconds"], ans: "B" },
    { q: "What is an alley-oop?", opts: ["A pass thrown behind the back that curves in an arc to a backdoor cutter", "A baseline drive where a player sprints along the end line and flips the ball underhanded", "A bounce pass scooped toward a cutter racing through the lane", "A lob pass thrown near the basket that a teammate catches in the air and dunks or finishes before landing"], ans: "D" },
    { q: "What is it called when a player makes a basket while being fouled on the same play?", opts: ["An and-one", "A bonus play", "A shooting foul plus", "A three-point opportunity"], ans: "A" },
    { q: "What does the restricted area (the small arc under the basket) protect for the offensive player?", opts: ["No offensive player may enter unless they have established a dribble outside the three-point line first", "This marks where the center must stand during all jump balls at the start of each period", "Defenders cannot draw a charge call on a driving offensive player while standing inside this arc", "Any shot from within this zone automatically counts as two points regardless of the shooter's foot position"], ans: "C" },
    { q: "When does a fast break typically occur?", opts: ["After a coach calls a timeout to signal a specific sprint play", "When the offense outnumbers the defense advancing toward the basket after a change of possession", "Whenever the ball changes hands and both teams reset at halfcourt simultaneously", "Only after a made basket when the scoring team's rules allow immediate advancement"], ans: "B" },
    { q: "What is a traveling violation?", opts: ["When the ball bounces across the halfcourt line without being touched by the defense", "When a player passes to a teammate who is standing out of bounds", "When a player uses their foot or leg to redirect the ball intentionally while it is in play", "When a player moves their pivot foot illegally or takes too many steps without dribbling"], ans: "D" },
    { q: "In the NBA, how long does an overtime period last?", opts: ["5 minutes", "3 minutes", "10 minutes", "7 minutes"], ans: "A" },
    { q: "What is a chest pass?", opts: ["A high overhead pass thrown with two hands from above the passer's head", "A quick one-handed push pass thrown from the hip to a sprinting teammate", "A two-handed pass thrown from chest level directly to a teammate's chest", "A bounce pass that starts at chest height and skips off the floor to the receiver"], ans: "C" },
    { q: "What does it mean to 'post up'?", opts: ["When a perimeter player retreats toward halfcourt to receive a pass away from pressure", "When a player establishes position in the low post near the basket with their back to the defender to receive a pass", "When a point guard stands stationary at the top of the key signaling plays to teammates", "When a player sprints to a spot behind the three-point line to catch a pass for an open look"], ans: "B" },
    { q: "What is the 'key' or 'lane' also commonly called?", opts: ["The arc", "The box", "The baseline", "The paint"], ans: "D" },
    { q: "What is the backboard?", opts: ["The rectangular board mounted behind the rim that players can use to bank shots into the basket", "The padding placed on stanchions to prevent injury when players collide with support structures", "The horizontal bars that form the frame of the basket rim holding the net in place", "The clear protective barrier separating front-row fans from players on the sideline"], ans: "A" },
    { q: "What is a full-court press?", opts: ["A referee warning given when a team protests a call so aggressively that play cannot resume", "A scoring play that occurs when a team makes a shot from behind their own baseline", "A defensive strategy where players guard opponents the entire length of the court from the moment of inbound", "A play where all five offensive players sprint toward the basket at the same time"], ans: "C" },
    { q: "If a player accidentally scores in their own team's basket, what happens?", opts: ["The basket is waved off and both teams line up for a jump ball at center court", "The basket counts as points for the opposing team", "The player is assessed a technical foul and the other team shoots two free throws", "The offensive team retains possession with a new shot clock after the own basket"], ans: "B" },
    { q: "What does 'APG' stand for in basketball statistics?", opts: ["Assists Per Game played total", "Average Player Grade per game", "Assists Per Game average", "Actual Points Gained per possession"], ans: "C" },
    { q: "What is a three-point shot?", opts: ["A shot made from beyond the free throw line that earns a bonus third point added to the standard two", "A shot made from beyond the three-point arc worth three points instead of two", "Any shot made while the shooter has both feet beyond the center circle", "A shot attempted from exactly 30 feet that officials review before it counts"], ans: "B" },
    { q: "What position number is traditionally assigned to the center?", opts: ["5", "4", "3", "2"], ans: "A" },
    { q: "What is the 'one-and-one' free throw situation?", opts: ["A special double free throw awarded only for flagrant fouls", "When a player attempts a difficult one-handed shot while drawing a foul", "The first free throw given any time a player commits their first foul of the game", "A bonus situation where the player must make the first free throw to earn the right to attempt a second"], ans: "D" },
    { q: "What is the net on a basketball hoop primarily for?", opts: ["To protect fans below from being struck by shots flying off the back of the rim", "To count assists by tracking whether the ball goes through cleanly or bounces around first", "To clearly show that the ball went through the hoop and to slow the ball down after scoring", "To add resistance during shooting practice so players must generate more power on their release"], ans: "C" },
    { q: "What does it mean when a player 'draws a foul'?", opts: ["When a player is intentionally fouled by the opponent to stop a fast break", "When a player causes the defense to commit a foul against them — often by creating contact during a shooting motion", "When a referee determines a player is exaggerating contact without real contact occurring", "When a player's teammate commits a foul and the first player takes responsibility at the scorer's table"], ans: "B" },
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
    { q: "What is a pick and fade compared to a pick and roll?", opts: ["They are identical concepts but the pick and fade is used exclusively in two man game situations", "In a pick and fade the screener steps back toward the three point line after setting the screen instead of rolling to the basket", "A pick and fade is exclusively designed for zone offense where rolling to the basket is blocked", "In a pick and fade the screener intentionally creates contact and then retreats to draw the foul"], ans: "B" },
    // V22 → B
    { q: "What does it mean to run early offense?", opts: ["Beginning warmups and layup lines before the opposing team has finished their own pregame routine", "Pushing the pace immediately after gaining possession to attack before the defense is set", "Calling a specific set play every single possession to eliminate improvisation and control the game", "Signaling a quick timeout immediately after a defensive rebound to rest before running the next play"], ans: "B" },
    // V23 → B
    { q: "What is a zone offense designed to do?", opts: ["Mirror the zone's alignment with five defenders who each guard one specific area of the floor", "Create gaps and ball movement that exploits the spaces and rotations of a zone defense", "Push tempo and force the zone into transition situations where it cannot fully rotate in time", "Isolate your best scorer on one side and let them beat their zone assignment one on one"], ans: "B" },
    // V24 → B
    { q: "What is basketball IQ?", opts: ["A statistical formula that divides a player's total points by their minutes played per game", "A player's ability to read the game make smart decisions and understand situations quickly", "A measure of a player's physical tools including speed vertical leap wingspan and hand size", "A rating based on how many years a player has competed in organized leagues at any level"], ans: "B" },
    // V25 → B
    { q: "What does it mean to play with pace?", opts: ["Sprinting at full speed on every possession regardless of defensive alignment or game situation", "Controlling the tempo deliberately choosing when to push and when to slow down to create advantages", "Pushing the ball in transition after every defensive rebound without ever setting up in half court", "Using the full shot clock on every possession to control the game and tire out the defense"], ans: "B" },
    // V26 → B
    { q: "What is an offensive rebound putback?", opts: ["When the defense secures the ball after a missed shot and quickly starts a fast break the other way", "When a player grabs their own team's missed shot and scores immediately", "A second free throw awarded when the defense commits a lane violation on the first attempt", "A quick shot taken off a direct inbound pass before the defense can establish their positions"], ans: "B" },
    // V27 → B
    { q: "What does weak side help mean in defense?", opts: ["The shortest or least skilled defender stepping in to support the player they believe is struggling", "A defender on the side away from the ball positioning to help if the ball handler beats their teammate", "A zone defensive adjustment that shifts all five players toward the strong side when the ball is entered", "Two defenders swapping their assignments whenever a screen comes their way on the strong side"], ans: "B" },
    // V28 → B
    { q: "What is a baseline drive?", opts: ["A ball handler dribbling toward the halfcourt line to reset the offense and buy more time on the clock", "An offensive player attacking along the baseline toward the basket usually from the wing or corner", "A quick outlet pass thrown up the sideline to a sprinting wing after a defensive rebound", "A low post player backing their defender toward the block and finishing with a short hook shot"], ans: "B" },
    // V29 → B
    { q: "What does it mean to deny the ball?", opts: ["The point guard holding the ball at the top without passing to keep the defense from setting up", "A defender actively positioning to prevent a pass from reaching their assigned offensive player", "A ball hawk defender tipping the ball free from a stationary dribbler and securing the steal", "A help defender stepping into the passing lane as the ball handler attacks to draw a charge"], ans: "B" },
    // V30 → B
    { q: "What is a pull up jumper?", opts: ["A shot launched off the back foot while fading away from the defender to create extra separation", "When a ball handler stops their dribble suddenly and rises to shoot a jump shot off the dribble", "A catch and shoot attempt launched immediately from behind the arc off a skip or kick out pass", "A two step stop followed by a set shot from the elbow taken off a post entry kick out pass"], ans: "B" },
    // V31 → B
    { q: "What does it mean to play off two feet compared to one foot?", opts: ["Using both hands to finish a layup instead of one allows the shooter to better protect the ball at the rim", "Jumping from two feet provides more power and control especially for contact finishes while one foot allows quicker release and more momentum", "The rulebook treats both approaches identically and neither is permitted inside the restricted area", "Two feet is reserved exclusively for power dunks while one foot is required on every layup attempt"], ans: "B" },
    // V32 → B
    { q: "What is a defensive breakdown?", opts: ["The coaching staff's review of the entire game on video to diagnose individual and team mistakes", "When the defense fails to rotate correctly leaving an offensive player open due to miscommunication or missed assignment", "A timeout called by the defensive team after allowing three unanswered baskets in quick succession", "The deliberate switch from a zone scheme to man to man to hide a weaker defensive player"], ans: "B" },
    // V33 → B
    { q: "What does it mean to set good screens?", opts: ["Running through every defensive player on the floor to open up as many driving lanes as possible", "Setting a legal screen with a wide base and solid contact that actually frees up a teammate rather than a lazy or moving screen", "Positioning only in the low post and setting screens exclusively for cutters along the baseline", "Setting screens near the halfcourt circle to free the ball handler from a full court press trap"], ans: "B" },
    // V34 → B
    { q: "What is a defensive stance?", opts: ["Standing fully upright with arms extended overhead to contest shots and prevent lob passes over the top", "A low balanced position with feet wide knees bent and hands active that allows a defender to move quickly in any direction", "Keeping both arms crossed at chest height to protect the torso while shadowing the ball handler", "Positioning directly behind the offensive player with both hands up to contest any turn and shoot"], ans: "B" },
    // V35 → B
    { q: "What does push the pace mean?", opts: ["Bodying up on the opposing ball handler at every opportunity to draw offensive fouls in transition", "Actively trying to advance the ball quickly and create fast break opportunities before the defense can set up", "Running a scripted fast break play out of every dead ball situation regardless of defensive positioning", "Calling a quick timeout after gaining possession to draw up the play before pushing up the floor"], ans: "B" },
    // V36 → B
    { q: "What is a mid range shot?", opts: ["A shot taken from behind the arc with both feet set and the elbow tucked inside the shooting pocket", "A jump shot taken between the three point line and the paint area", "An uncontested shot from the free throw line awarded after a non shooting defensive foul is committed", "A short distance shot taken from inside the restricted circle off one foot near the basket"], ans: "B" },
    // V37 → B
    { q: "What does it mean to read the defense?", opts: ["Scanning the back of each opponent's jersey to identify mismatches by number and report to the bench", "Recognizing what the defense is doing and making the correct offensive decision based on what is available", "Calling out the numbered play the coach drew up regardless of what the defense shows on that possession", "Automatically passing to the first open teammate you see without assessing the whole floor first"], ans: "B" },
    // V38 → B
    { q: "What is a hockey assist in basketball?", opts: ["A penalty assessed when a player swings their elbow and makes contact with an opposing defender", "The pass made to the player who makes the pass that directly leads to a basket — two passes before the score", "A skip pass thrown the full width of the court to find a shooter in transition before the defense rotates", "A behind the back pass that travels the length of the floor to a sprinting teammate for a layup"], ans: "B" },
    // V39 → B
    { q: "What does it mean to be a good teammate off the ball?", opts: ["Celebrating loudly on every made basket and vocally encouraging teammates from the sideline during play", "Moving with purpose setting screens communicating and positioning to create opportunities even when you do not have the ball", "Keeping your distance from the ball handler so they have space to operate and are never crowded", "Staying in the strong side corner on every possession and waiting for an open three point look"], ans: "B" },
    // V40 → B
    { q: "What is a late clock situation?", opts: ["When the scoreboard or shot clock malfunctions and referees must estimate how much time has elapsed", "When very little time remains on the shot clock or game clock requiring quick decisive offensive action", "The final twelve minutes of a regulation game beginning at the start of the fourth quarter", "An extra period of play added when the score is tied at the end of regulation"], ans: "B" },
    { q: "What is a 'box-and-one' defense?", opts: ["Four defenders play a zone box while one defender guards the opponent's best player man-to-man", "All five defenders form a box near the paint and refuse to guard any perimeter player", "Four defenders chase the ball handler aggressively while one defender protects the paint alone", "A defense where players rotate clockwise in a box pattern around the arc to deny all perimeter passes"], ans: "A" },
    { q: "What does it mean to 'front the post'?", opts: ["The point guard calling for the ball from the post to start a pick-and-roll", "A center positioning between the basket and their opponent waiting for an entry pass", "A defender positioning between the ball and the post player to deny the entry pass rather than playing behind", "Setting a screen at the elbow using the front of the body rather than the shoulder"], ans: "C" },
    { q: "What is an isolation play?", opts: ["A play where all five offensive players sprint to the corners for maximum spacing", "A defensive set removing one player from help duties to place them entirely on the opponent's best scorer", "A play called after a referee stops the game to sort out a potential rules violation", "A play that clears space for one offensive player to go one-on-one against their defender"], ans: "D" },
    { q: "What is a press break?", opts: ["A referee's stoppage allowing a player to recover from a hard foul before play resumes", "A structured offensive system designed to advance the ball against a full-court press defense", "A timeout called immediately after the opposing team starts pressing to prevent a turnover", "The moment a zone defense breaks down due to poor rotation leaving an offensive player open"], ans: "B" },
    { q: "What is 'splitting the trap'?", opts: ["When a ball handler passes between two trapping defenders to break the pressure and advance the ball", "When two offensive players simultaneously cut through the lane forcing the defense to choose one to guard", "A technique where a post player passes through a double team to a cutter for an easy layup", "A full-court press where the offense sends two players ahead through the defenders"], ans: "A" },
    { q: "What is 'help and recover' in defense?", opts: ["A defensive adjustment when a starter is injured helping them off the court before recovering to coverage", "Two defenders collapsing on the post player simultaneously and then recovering to their assigned players", "A defender steps in to stop a drive then quickly recovers back to their original assignment before the ball is passed out", "One player from the weak side doubles the ball then a teammate recovers to the open man"], ans: "C" },
    { q: "What is an 'intentional foul' used for tactically?", opts: ["A foul called automatically when a player has committed their fourth personal foul of the game", "A deliberate foul committed by the defense to stop the clock or prevent a high-percentage shot near the end of a game", "A foul so severe it results in immediate ejection and a one-game suspension", "Any contact foul committed during a fast break that prevents an uncontested layup"], ans: "B" },
    { q: "What makes the corner three strategically valuable?", opts: ["It is far less contested than shots from the wing making the percentage significantly higher", "It is one of the shortest three-point shots on the floor because the arc meets the sideline at a closer distance, giving it a higher expected value than most long twos", "Corner specialists are exclusively left-handed shooters who use the baseline angle for a natural shooting pocket", "The corner three counts for four points in many professional leagues because of the extreme angle difficulty"], ans: "B" },
    { q: "What does it mean to 'cut' in basketball?", opts: ["A quick deliberate movement by an offensive player without the ball to get open for a pass or scoring opportunity", "Defending by taking an aggressive angle to force the ball handler toward the sideline", "A coach's decision to reduce a player's minutes mid-season", "A sharp dribble move where a player quickly reverses direction to lose a defender"], ans: "A" },
    { q: "What is a double team?", opts: ["When two offensive players set screens on the same defender simultaneously to create a mismatch", "When a player receives two fouls on the same possession and is immediately disqualified", "When two defenders converge simultaneously on the ball handler to trap and force a turnover or rushed decision", "A zone where two players always guard the opponent's best scorer regardless of position"], ans: "C" },
    { q: "What does 'assist-to-turnover ratio' measure?", opts: ["The number of times a player passes to the scorer compared to their total turnovers in a season", "How many assists a player records relative to how many turnovers they commit — a higher ratio indicates smarter playmaking", "The total passes a player makes per game compared to their usage rate as the primary ball handler", "A formula dividing a team's assists by the opposing team's turnovers to measure relative ball security"], ans: "B" },
    { q: "What does 'effective field goal percentage' (eFG%) account for?", opts: ["Only field goal attempts released without the ball touching the rim or backboard first", "A shooting percentage counting only uncontested attempts to remove defensive difficulty from the stat", "A formula averaging two-point and three-point percentages to give a combined accuracy number", "The extra value of three-point makes since they are worth 50 percent more than two-point baskets, giving three-point shooters appropriate credit"], ans: "D" },
    { q: "What is the 'elbow' on a basketball court?", opts: ["The junction where the free throw line meets the lane line, forming a corner at the top of the key", "The curved top of the three-point arc directly above the center of the basket", "The midpoint of the baseline on either side where corner attempts are launched", "The spot on the wing where a player traditionally receives a hand-off from the ball handler"], ans: "A" },
    { q: "What is a 'drive and dish'?", opts: ["A post move where a player drives their shoulder into the defender then dishes to a cutter before contact is called", "An inbound play where the inbounder drives the length of the court and dishes to a trailer", "When a ball handler drives into the paint to collapse the defense then passes out to an open teammate", "A transition sequence where a wing sprints the court and dishes to the point guard at the three-point line"], ans: "C" },
    { q: "What is 'rim protection' as a defensive concept?", opts: ["Padding wrapped around the rim to prevent injury during dunk attempts", "A defensive approach focused on challenging and deterring shots near the basket using size, positioning, and timing", "A zone rule requiring one player to remain within six feet of the rim at all times regardless of ball movement", "Using the basket stanchion as a visual anchor for defenders protecting the paint"], ans: "B" },
    { q: "What is a 'zone press'?", opts: ["The statistical advantage the defense presses when the opponent's shooting drops below 30 percent", "A play where the offense collapses into the paint to draw contact from multiple zone defenders", "A half-court zone that spreads across the three-point line with only one help defender inside", "A full-court or three-quarter-court pressure defense using zone principles rather than man-to-man assignments"], ans: "D" },
    { q: "What is a 'dump off' or 'drop pass' in offense?", opts: ["A short pass thrown to a post player or cutter in the paint when a ball handler's drive is cut off", "Deliberately passing backward to the point guard to reset the shot clock without a violation", "A behind-the-back pass that drops sharply to a player coming off a screen below", "A deliberate turnover given to the other team when the losing squad needs the opponent to score quickly"], ans: "A" },
    { q: "What does 'True Shooting Percentage' (TS%) measure?", opts: ["The percentage of shots made while closely guarded within six feet by a defender", "A shooting percentage counting only shots released without touching rim or backboard", "A comprehensive shooting efficiency metric that accounts for two-point field goals, three-point field goals, and free throws together", "A stat measuring only catch-and-shoot attempts as opposed to shots created off the dribble"], ans: "C" },
    { q: "What is the 'triangle offense'?", opts: ["A defensive alignment with three players near the paint and two guarding the perimeter", "A spacing-based offensive system built on passing principles and player reads with triangle-shaped sideline alignments", "A fast break option initiated whenever three offensive players outnumber two defenders in transition", "An inbounds play designed to create an open three-point shot using three players as screeners"], ans: "B" },
    { q: "What is a 'sixth man'?", opts: ["A team's emergency player who suits up but cannot enter unless two starters are injured", "A sixth position in basketball created to accommodate two-way players on split contracts", "The player on the bench who manages substitutions and communicates between the coach and starters", "The best non-starting player who comes off the bench and often provides the team's biggest offensive spark"], ans: "D" },
    { q: "What does 'switching' mean in pick-and-roll defense?", opts: ["The on-ball defender and the big trade assignments after the screen is set so each guards the other player", "All five defenders shift one position to the left whenever a ball screen is set anywhere on the floor", "A signal from the point guard triggering all five defenders to sprint to the paint and zone up", "Two guards and two bigs alternating who guards the opposing ball handler each possession"], ans: "A" },
    { q: "What is 'floor spacing' in offense?", opts: ["The measured distance between the court boundary lines and the first row of courtside seating", "The strategic use of timeouts to give offensive players rest before executing a final possession", "Positioning offensive players around the court to spread the defense and create driving lanes and passing angles for the ball handler", "A stat measuring how many square feet of open space each player covers per defensive possession"], ans: "C" },
    { q: "What is a 'weak side flash' in offense?", opts: ["A quick backdoor cut along the baseline when the defense shifts entirely to the strong side", "A player on the weak side cutting into the middle of the lane to receive a pass as a safety valve or scoring option", "A skip pass thrown to the corner player who was open on the weak side", "A defensive adjustment where the weak side forward breaks toward the ball to trap the strong side post"], ans: "B" },
    { q: "What is a 'wrap-around pass' used for in the post?", opts: ["A pass that travels around the perimeter from one side of the court to the other through multiple teammates", "A technique where the passer wraps their arm around a defender to reach a cutter in the paint", "A pass that curves due to the spin applied by the passer's fingertips as they release", "A pass thrown around a defender's body in the post to deliver the ball to a cutter without the defender being able to deflect it"], ans: "D" },
    { q: "What is the difference between a 'hard hedge' and a 'soft hedge' in pick-and-roll defense?", opts: ["A hard hedge has the big aggressively stepping out to cut off the ball handler at the level of the screen; a soft hedge has the big showing briefly then retreating to protect the paint", "A hard hedge is only used in late-game situations; a soft hedge is the standard approach for the first three quarters", "Hard means the big stays on the screener; soft means they immediately switch to the ball handler", "A hard hedge involves physical contact with the screener during the pick; a soft hedge avoids all contact"], ans: "A" },
    { q: "What is 'ball movement' and why does it matter offensively?", opts: ["A foul called whenever the ball is adjusted by a player who has already picked up their dribble", "Tracking the travel path of the ball using camera technology to analyze winning team patterns", "Passing the ball quickly from player to player to move the defense and create open shots or driving lanes", "Advancing the ball up the floor as fast as possible to prevent the opponent from setting up their defense"], ans: "C" },
    { q: "What does 'playing in the post' mean?", opts: ["A player camping at the top of the key and receiving handoffs from the center to begin each possession", "A player establishing position in the low block near the basket to receive entry passes and score from close range", "A guard taking over the role of calling plays when the point guard is guarded tightly above halfcourt", "Defending the opponent's center by positioning one foot in front and one behind the basket"], ans: "B" },
    { q: "What does 'running a set play' mean?", opts: ["Going into a full-court press immediately after the other team scores to create a quick turnaround", "Running the same offensive action repeatedly until the defense stops it or the game situation changes", "Calling a timeout to rest starters so they have fresh legs to execute a final possession", "Executing a scripted offensive sequence with specific player movements and passes designed to create a high-quality shot"], ans: "D" },
    { q: "What is an 'outlet pass'?", opts: ["The first pass thrown by a defensive rebounder to a teammate to quickly start a fast break in the other direction", "A last-resort pass thrown out of bounds intentionally to save a possession and reset with an inbound", "A desperate half-court pass launched before the shot clock buzzer to avoid a violation", "A quick entry pass into the low post the moment a teammate establishes deep position on their defender"], ans: "A" },
    { q: "What is a 'shooting foul'?", opts: ["A foul called on an offensive player who creates contact while dribbling toward the basket", "A foul called any time a defender's feet are not set when an offensive player drives toward them", "A foul committed by a defender on an offensive player during their shooting motion, resulting in free throws", "A special foul called when a player releases before the shot clock buzzer and the defender hits their hand"], ans: "C" },
    { q: "What does 'living in the mid-range' mean about a player's game?", opts: ["A player who only performs well in the second and third quarters when the game is within single digits", "A player who primarily takes jump shots between the paint and the three-point line rather than attacking the rim or spotting up for threes", "A player who controls pace to ensure the team operates at a moderate tempo regardless of the score", "A player stationed at the free throw line extended who rarely moves from that spot during possessions"], ans: "B" },
    { q: "What is a 'hand check' foul?", opts: ["A foul when a player picks up a loose ball with one hand instead of securing it with both", "A violation when the ball handler uses their non-dribbling hand to push away a defender during a dribble move", "A foul when a defender's hand contacts the shooter's wrist instead of the ball during a shot attempt", "A foul called when a defender uses their hand or arm to impede the movement of a ball handler by placing consistent pressure on them"], ans: "D" },
    { q: "What does it mean to 'take care of the ball'?", opts: ["Avoiding turnovers by making smart decisions and keeping the basketball secure through contact and pressure", "An official rule requiring ball handlers to keep both hands on the ball whenever standing near a defender", "Protecting the basketball from getting wet or damaged during outdoor play by keeping it covered between possessions", "The process of rotating game balls during timeouts to ensure a fresh ball is used each possession"], ans: "A" },
    { q: "What is 'rim running' for a big man in offense?", opts: ["A center continuously jogging along the baseline to confuse zone defenders with constant movement", "A fast-break finishing technique where a big bowls through defenders for a power layup", "A big man cutting hard toward the basket as a screen or pass is initiated to position for a lob or dump-off near the rim", "A drill where post players practice tipping the ball up after it bounces off the back of the rim"], ans: "C" },
    { q: "What is 'playing the angles' on defense?", opts: ["Using the court corner to trap a ball handler between the sideline, baseline, and a defender simultaneously", "Positioning your body to funnel the offensive player in a specific direction rather than giving them a straight path to the basket", "Analyzing shot charts to determine which court angles produce the highest field goal percentage", "Timing your jump to arrive at the peak of your leap exactly when the shooter releases the ball"], ans: "B" },
    { q: "What does 'playing through contact' mean?", opts: ["When an official determines contact was minor and allows play to continue without a foul call", "Deliberately absorbing contact from a defender while shooting to increase the chance of drawing a foul", "A training concept where players repeatedly take hits during scrimmages to build mental toughness", "Continuing to attack or finish a play despite being fouled or hit by a defender rather than stopping when contact occurs"], ans: "D" },
    { q: "What is a 'corner trap' defense?", opts: ["A defensive scheme funneling the ball handler to the corner where two defenders collapse to trap between the sideline and baseline", "A zone alignment positioning two defenders permanently in each corner to prevent corner three-point shots", "Trapping the opponent's best player in the corner of the bench area using coaching staff positioning", "A half-court press that only activates when the ball is passed to either corner"], ans: "A" },
    { q: "What does it mean to protect the basketball?", opts: ["Keeping the ball in a controlled dribble below the waist so defenders cannot reach in and poke it away", "An official rule requiring ball handlers to keep both hands on the ball whenever near a defender", "Avoiding turnovers by making smart decisions, securing the ball through contact, and limiting risky passes", "The process of switching to a safer ball any time it comes near a wet surface or damaged area"], ans: "C" },
    { q: "What is a '1-3-1 zone defense'?", opts: ["One post defender guarding the basket, three guards pressing full court, and one chaser assigned to the ball handler", "One defender at the top, three spread across the middle (wings and high post), and one guarding the baseline", "One center rotating through all five positions while three guards double the ball handler on every catch", "One center in the paint, three rotating guards at the arc, and one designated shot blocker at the elbow"], ans: "B" },
    { q: "What is 'playing to your strengths'?", opts: ["Always attacking the defense from the same spot to build a reliable rhythm and predictable scoring output", "Refusing assignments outside your comfort zone to protect your shooting percentages and statistical output", "Communicating to the coach which plays you prefer and which you feel uncomfortable executing in crunch time", "Understanding what you do well and consistently putting yourself in situations where your best skills are utilized most effectively"], ans: "D" },
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
    { q: "What is a Spain pick and roll?", opts: ["A transition offense that pushes two guards ahead while a big trails to create a trail three point opportunity", "A play where a screener sets a back screen on the rolling big man's defender as they roll creating a layup opportunity", "A half court defensive scheme combining a zone front with man to man coverage on the low block", "A press break alignment where four players spread wide and one ball handler advances up the middle"], ans: "B" },
    // E22 → B
    { q: "What does it mean to play the level of the screen?", opts: ["Adjusting your defensive crouch so your shoulders are level with the screener's waist as they approach you", "A defensive technique where the on ball defender fights over the screen at exactly the height it is set rather than going under or dramatically over it", "Positioning your body so you set screens at the precise height and spot the coach designated before the play", "Jumping over the screen at its peak height to contest the pull up jumper before it is fully released"], ans: "B" },
    // E23 → B
    { q: "What is a drop coverage in pick and roll defense?", opts: ["The center intentionally passes the ball back to the guard to reset and force a five second violation", "The big defender drops back toward the paint allowing the ball handler a mid range shot while protecting against the roll and drive", "All five defenders shift into a flat zone shell giving up the arc entirely to protect the paint from drives", "The on ball defender and the big both collapse on the ball handler and force them to give up their dribble"], ans: "B" },
    // E24 → B
    { q: "What does it mean to play the three quarter deny?", opts: ["Fronting the offensive player in the post completely so they cannot receive any entry pass from the perimeter", "A defensive position three quarters of the way between the defender's player and the ball actively working to deny the pass while staying close enough to recover", "A zone adjustment that has three of four perimeter defenders shift toward the weak side on every skip pass", "Sagging far off the offensive player to clog the paint and protect against back cuts and strong side drives"], ans: "B" },
    // E25 → B
    { q: "What is a pistol action in basketball offense?", opts: ["An up tempo pressing style where the team attacks with speed and physicality on every possession regardless of set plays", "A two man action combining a dribble hand off with a pick and roll that can be initiated from various spots", "A trapping full court press triggered immediately after every made basket by the opposing team", "A quick isolation set where the best scorer clears out one side and attacks off the first dribble"], ans: "B" },
    // E26 → B
    { q: "What does loading the leg mean for a shooter?", opts: ["A sign the shooter is fatigued and losing the leg strength needed to consistently reach their shooting range", "The slight downward dip or gathering motion a shooter uses before rising that generates power and rhythm", "A foul called when a defender makes contact with a shooter's lower body during their shooting motion", "A technique where a shooter stands only on their lead foot before rising to add extra lift to their shot"], ans: "B" },
    // E27 → B
    { q: "What is a floppy action?", opts: ["A label for a team that plays without energy or intensity and lets the defense dictate the entire game", "An off ball action where a player cuts off staggered screens on either side of the lane and can go either direction keeping the defense guessing", "A high post entry where the ball is caught at the elbow and immediately fed into the low post block", "A quick outlet pass in transition that sends the ball ahead before the defense can sprint back to set up"], ans: "B" },
    // E28 → B
    { q: "What does it mean to play downhill?", opts: ["Running plays specifically designed for lower elevation courts where the ball carries differently than at altitude", "Attacking aggressively toward the basket using speed and momentum rather than resetting or pulling back", "Sagging off perimeter shooters and conceding the three point shot to protect the paint against drives", "Controlling pace by milking the shot clock and using the full possession to grind down the defense"], ans: "B" },
    // E29 → B
    { q: "What is a blocker mover offense?", opts: ["A rugged half court style built around posting up and drawing contact on every single possession inside", "A system where some players set screens as blockers while others use those screens as movers to get open shots", "A transition based system that scores exclusively off fast breaks and avoids half court sets entirely", "A five out motion scheme where every player operates as an interchangeable scorer and ball screen setter"], ans: "B" },
    // E30 → B
    { q: "What does it mean to play with a high motor?", opts: ["Pushing the ball in transition off every single possession and refusing to set up in the half court at all", "Playing with relentless effort on every possession never taking plays off and consistently going hard for loose balls rebounds and stops", "Being the most physical presence on the floor at all times and initiating contact on every drive to the rim", "Taking the first available shot on each possession to maintain a fast pace and prevent long possessions"], ans: "B" },
    // E31 → B
    { q: "What is a read and react offense?", opts: ["A system where players look to the bench for the coach's hand signals before initiating each possession", "A system where players react to what each pass or action triggers rather than running set plays making it adaptable against any defense", "A fast break system designed to score within the first five seconds of gaining possession on every trip", "An isolation heavy offense where each player receives one designated possession per half to attack one on one"], ans: "B" },
    // E32 → B
    { q: "What does shot selection mean and why does it matter?", opts: ["Designating one primary shooter per possession so the remaining four players space the floor around them", "The discipline of only taking shots that are high percentage and within your skill set rather than forcing difficult shots", "Getting as many attempts up per game as possible to maximize statistical output and maintain a scoring rhythm", "Restricting all shot attempts to three point attempts because of their inherently higher point value per shot"], ans: "B" },
    // E33 → B
    { q: "What is a zone buster offense?", opts: ["A physical half court system that attacks the zone with post seals and drives directly into the defense's teeth", "Specific principles designed to attack zones including skip passes high low passing baseline cuts and placing shooters in the gaps", "A transition focused offense that pushes pace to catch zones before they can fully set and communicate rotations", "A deliberate possession oriented system that milks the shot clock to tire out the zone's defensive rotations"], ans: "B" },
    // E34 → B
    { q: "What does it mean to be a connector player?", opts: ["A player whose primary skill is delivering accurate skip passes that link the weak side to the strong side", "A versatile player who can play multiple positions and connect different parts of the offense making them valuable in multiple lineups", "A role reserved solely for the point guard who controls tempo and connects the guards to the frontcourt", "A player whose entire value comes from shutting down opposing offensive stars on the defensive end of the floor"], ans: "B" },
    // E35 → B
    { q: "What is a secondary break in transition?", opts: ["The rest period between the first and second half where the coaching staff makes their primary adjustments", "After the initial fast break the offense continues pushing pace with structured actions including a trailer for a three point shot", "A stoppage called immediately after a score to organize the offense before running the designed set play", "A scripted half court play run after the ball is walked up following a defensive rebound with no fast break"], ans: "B" },
    // E36 → B
    { q: "What does it mean to take what the defense gives you?", opts: ["Reading the angle of a defender's wrist to anticipate a steal attempt and protect the ball before they react", "Making smart decisions based on how the defense is positioned rather than forcing predetermined actions — drive if they give the drive shoot if they give the three", "Attacking every defensive scheme the same way regardless of alignment to build a consistent and predictable rhythm", "Running the same play on every possession because familiarity with the action reduces decision making errors"], ans: "B" },
    // E37 → B
    { q: "What is a defensive anchor and what makes someone effective in that role?", opts: ["The player with the fewest primary assignments who is available to help whenever a teammate needs support", "The last line of defense typically a big who communicates switches protects the rim and organizes the defense combining size awareness and vocal leadership", "The most physical defender whose value comes entirely from punishing drivers with hard contact at the rim", "The player stationed on the opposing team's lead guard responsible for preventing ball advancement at halfcourt"], ans: "B" },
    // E38 → B
    { q: "What does it mean to play with purpose off the ball?", opts: ["Sprinting aimlessly around the perimeter to tire out the defender and eventually get open through sheer attrition", "Every movement has intention — cutting at the right time setting useful screens positioning in spaces that stress the defense and being ready to shoot immediately on receiving a pass", "Planting yourself in the near corner and standing completely still so the ball handler has a clear kick out option", "Shadowing the ball handler everywhere on the floor so you are always an outlet if they get trapped or doubled"], ans: "B" },
    // E39 → B
    { q: "What is a defensive shell drill and what does it teach?", opts: ["A stationary drill where players simulate shooting off the catch from five spots around the three point arc", "A foundational drill where players practice positioning help rotations and communication against offensive movement teaching principles of team defense", "A competitive one on one drill where the defender must prevent the offensive player from scoring in four dribbles", "A timed conditioning drill where players sprint baseline to baseline in prescribed intervals to build stamina"], ans: "B" },
    // E40 → B
    { q: "What does it mean when a coach says trust the process?", opts: ["Running the exact same play every single possession until the defense stops it or adjusts to take it away", "Believing that consistent effort correct habits and team principles produce results over time even when immediate results are not visible", "Practicing the same set of plays repeatedly every possession so the team builds automatic muscle memory", "Deferring every decision to the coaching staff rather than using individual judgment during live game situations"], ans: "B" },
    { q: "What is the 'Princeton offense'?", opts: ["A pressing style where all five players sprint to the frontcourt after every dead ball", "An isolation-based system that clears the weak side for one-on-one matchups every possession", "A read-based offense built around back cuts, reversals, and the high post that exploits aggressive man-to-man defense", "A spread pick-and-roll system placing the point guard at the top and four shooters in the corners"], ans: "C" },
    { q: "What is a 'stagger screen'?", opts: ["Two screens set in sequence along the same path so a cutter uses both back-to-back to create maximum separation from their defender", "When two defenders simultaneously lose their assignments causing overlapping coverage on one player", "A double screen where both screeners face the same direction and the cutter reads which side they exit from", "A delayed screen set after a pass so the defense has already committed before the screen is initiated"], ans: "A" },
    { q: "What is 'slipping a screen'?", opts: ["When a defender fights through a screen illegally by using their forearm to create a path", "When a ball handler abandons the screen action and pulls back to reset rather than turning the corner", "When a screener shifts to a new spot just before a double team arrives to neutralize their screen", "When the screener abandons the screen and cuts hard to the basket before the defender makes contact, using the motion as misdirection"], ans: "D" },
    { q: "What is a 'matchup zone'?", opts: ["A zone that immediately switches to man-to-man any time a player drives into the paint", "A hybrid defense that mimics man-to-man principles within zone assignments, making it effective against multiple offensive sets", "A zone built exclusively for switching all screens combining zone positioning with man-to-man switch rules", "A zone that mirrors the offense's personnel exactly — if the offense goes big the zone uses all big men"], ans: "B" },
    { q: "What is a 'pocket pass'?", opts: ["A quick handoff from the ball handler to a post player rolling behind the defensive line", "A backward toss made behind the back over the shoulder used exclusively between two guards in a two-man game", "A short precise pass delivered to a cutter or roller in a tight window before the defense can close off the lane", "A pass thrown below the defender's hands toward the hip of a receiver cutting through lane traffic"], ans: "C" },
    { q: "What is a 'BLOB' in basketball?", opts: ["A scripted play designed to generate a high-quality shot off a baseline out-of-bounds inbound pass", "A loose ball situation where five players scramble near the baseline after a blocked shot", "An offensive term for a possession where the point guard cannot find any open receiver and holds the ball", "A blocking assignment given to the largest player to protect the restricted area"], ans: "A" },
    { q: "What does 'pace and space' mean as an offensive philosophy?", opts: ["Slowing the game to control the shot clock while spreading three-point shooters around for post opportunities", "Pushing pace exclusively in transition while spreading defenders using a zone press to accelerate possessions", "Using a large frontcourt to occupy space in the paint while controlling pace with a veteran point guard", "Playing at high tempo with shooters spread around the perimeter to stretch defenses and create layup opportunities off drives"], ans: "D" },
    { q: "What does 'on/off split' measure in basketball analytics?", opts: ["The difference in a player's shooting percentage when guarded closely versus when left open", "The difference in a team's net rating when a specific player is on the court versus when they are off it", "The gap between a player's first-half and second-half statistics across a full season", "The comparison between a player's regular season and playoff performance numbers"], ans: "B" },
    { q: "What is a 'gut cut'?", opts: ["An explosive crossover executed at the defender's midline to split their stance and drive past them", "An urgent bench signal to cut immediately to the strong side block regardless of the play called", "A sudden cut from the wing or elbow through the middle of the lane toward the basket, using a read off the defense's positioning to get open", "A low-percentage interior shot forced against traffic that coaches discourage as poor shot selection"], ans: "C" },
    { q: "What is the strategic value of the corner three compared to a long two-point shot?", opts: ["The corner three is one of the shortest three-point shots on the floor and provides 50 percent more value per make than a two-pointer at equal shooting percentages, making it analytically superior", "The corner three is worth only slightly more because the higher difficulty makes it statistically equivalent to most mid-range shots", "Analytics show mid-range shots convert at a high enough rate that elite shooters should prioritize them over corner threes", "The corner three and mid-range have effectively identical expected value because defenders contest them equally aggressively"], ans: "A" },
    { q: "What is a 'SLOB' in basketball?", opts: ["A player who ignores defensive principles and takes contested shots every possession", "A slow ball handler who cannot push transition — a liability in pace-based systems", "A big man's habit of staying in the dunker spot instead of popping to stretch the defense on drive-kick plays", "A scripted play designed to generate a good shot off a sideline out-of-bounds inbound pass"], ans: "D" },
    { q: "What is 'defensive rating' (DRTG)?", opts: ["A composite score grading each defender based on charges drawn, steals, and blocks per possession", "The number of points a team or player allows per 100 possessions — a lower number indicates better defense", "The percentage of shots a defense forces from low-percentage mid-range areas", "A scout's proprietary system ranking defenders from 1 to 100 based on film and statistical output"], ans: "B" },
    { q: "What is a 'drag screen' in transition?", opts: ["A screen set illegally using the defender's hips to slow a cutter running across the lane in transition", "A screen set at the three-point line by a big who trails the ball handler from the defensive end", "A ball screen set by a trailing big as the point guard pushes transition, catching the defense before they can fully set", "A delayed screen set when the initial fast break breaks down and the offense resets to a half-court set"], ans: "C" },
    { q: "What is the '5-out offense' (also called Dribble Drive Motion)?", opts: ["All five players start outside the three-point arc with no one in the post, creating maximum driving lanes to the basket", "A possession-based system where all five players take turns initiating offense from the point guard position", "A system requiring each player to handle the ball at least five times per possession before a shot is taken", "An offense where only the point guard may drive while the other four remain stationary on the arc"], ans: "A" },
    { q: "What is a 'box set' inbound play?", opts: ["A play called to protect a one-point lead in the final thirty seconds by sending all five players to halfcourt", "A set where players start in four corners of the paint and sprint to opposite corners to confuse the defense", "An inbound where four players form a diamond and use a staggered screen to free the best free throw shooter", "An inbound play where four players form a box shape in the paint and use screens to free a shooter for a catch-and-shoot opportunity"], ans: "D" },
    { q: "What does 'offensive rebounding rate' measure?", opts: ["The percentage of missed shots a team's starting lineup recovers compared to the league average", "The percentage of available offensive rebounds that a player or team actually secures", "How many offensive rebounds per game a team averages compared to their defensive rebounding total for the same game", "The number of offensive rebound putbacks a team converts per 100 possessions as a measure of second-chance scoring"], ans: "B" },
    { q: "What is a 'loop action' in offense?", opts: ["A play where the ball handler runs a full loop around the three-point arc before initiating any screen action", "A full-court defensive rotation cycling all five players counterclockwise after every change of possession", "A play where the point guard dribbles away from the primary ball screen then uses a second action on the opposite side to create a fresh scoring opportunity", "A movement drill requiring every player to run a circular path between the elbow, corner, and wing before receiving any pass"], ans: "C" },
    { q: "What is an 'elevator screen'?", opts: ["Two screeners who start wide apart then simultaneously close together as a cutter runs between them, using the closing gap to trap the defender inside", "A two-player action where one player lifts the other overhead using their body as a platform for a dunk finish", "A screen where two players face each other with arms extended upward forming an arch for the cutter to run beneath", "A play where a cutter stops at the elbow and receives the ball just as a screener rises from the block to set a back screen"], ans: "A" },
    { q: "What is the relationship between 'DRTG' and 'ORTG' in advanced analytics?", opts: ["DRTG measures how many points are scored per 100 possessions; ORTG measures how many points are allowed per 100 possessions", "DRTG measures how many points are allowed per 100 possessions; ORTG measures how many points are scored per 100 possessions", "DRTG is a team-level metric only; ORTG is individual-level and the two cannot be meaningfully compared", "Both DRTG and ORTG measure net points per 100 possessions but from opposite team perspectives"], ans: "B" },
    { q: "What does a 'scramble drill' teach defenders in practice?", opts: ["How to recover, communicate, and find the correct assignment after a screen causes their coverage to break down", "A timed drill where all five players sprint to pick up loose balls scattered around the court competitively", "A game simulation where the offense has ten seconds to score after a dead ball without running any set play", "A drill where the point guard calls out defensive assignments for all five players while dribbling at full speed under pressure"], ans: "A" },
    { q: "What is a 'shallow cut' on the weak side?", opts: ["A backdoor cut along the baseline on the weak side right after the ball is reversed to the strong side", "A reading technique used by the weak-side post defender to decide whether to help on a drive or maintain position", "A player on the weak side moving upward toward the ball on a cut through the lane rather than diving toward the basket", "A pass from the strong side corner to a player near the halfcourt circle on the weak side"], ans: "C" },
    { q: "What does 'switchable' mean in modern basketball?", opts: ["A player equally effective on both offense and defense without a reduction in performance in either area", "A team's ability to change its defensive scheme multiple times within a single possession to confuse the offense", "An analytics term quantifying how many different defensive assignments a player can physically cover per game", "A player who has the size, athleticism, and skill to effectively guard multiple positions, making team-wide switching defensive schemes practical"], ans: "D" },
    { q: "What is the purpose of a 'high-low' offensive action?", opts: ["Keeping one player high on the arc and one low in the corner to spread the defense across the maximum distance", "Passing from a player at the elbow (high post) to a player on the block (low post) to create easy scoring when the defender loses sight of the cutter or is late to react", "A tempo strategy alternating between fast-break pace and slow deliberate possessions to confuse the defense's energy management", "Positioning your tallest player at the top of the key and shortest player in the paint to create unexpected mismatches"], ans: "B" },
    { q: "What does 'BPM' (Box Plus/Minus) measure?", opts: ["A statistical estimate of a player's contribution to the team's net point differential per 100 possessions relative to a league-average player", "The difference in team net rating when the best player is in the game versus on the bench", "A breakdown of how many points per game come from points, rebounds, assists, steals, and blocks", "An advanced scouting metric rating off-ball movement, screening, and shot creation on a plus/minus scale"], ans: "A" },
    { q: "What does 'shooting off phantom screens' mean?", opts: ["An illegal practice where a shooter fakes being screened then shoots while the defender is still in position", "Using screens that are set but never touched by the cutter who attacks in the opposite direction instead", "When a shooter uses the movement and threat of an upcoming screen to get the defender moving, then attacks or shoots without actually needing to use the screen at all", "Scoring so quickly after receiving the ball that the screen set for the shooter is rendered irrelevant by the defense"], ans: "C" },
    { q: "What makes 'playing the gaps' in a 2-3 zone most effective?", opts: ["Baiting the zone into overplaying one side so the offense can skip to the other for an uncontested three", "Clogging the passing lanes in the gaps so thoroughly that the zone can collapse on every perimeter pass before it arrives", "Forcing the top two zone defenders so wide that the middle defender is isolated and exploited with high-low passes", "Making each gap feel threatened simultaneously so no defender can fully commit to stopping any single action without leaving another gap exposed"], ans: "D" },
    { q: "What is a 'trail three' in transition offense?", opts: ["A three-point shot attempted by a wing who has fallen behind the fast break and catches up after the initial action", "A three-point shot taken by a trailing guard or big who catches a kick-out pass at the arc as the defense collapses on the driver", "A shot clock violation occurring when the trailing team cannot get a shot off because the leading team stalls", "A penalty shot awarded to the trailing team when the leading team intentionally fouls during a fast break with under two minutes remaining"], ans: "B" },
    { q: "What is a 'post split action'?", opts: ["Two players cutting off the post catch — one over the top and one cutting backdoor — forcing the post defender to choose which cutter to follow", "A play where the post player dribbles between two defenders and finishes with a reverse layup", "A half-court trap where two defenders split from the zone and double the post player on every catch", "A technique where the post player catches, immediately pivots to face the basket, and attacks either direction based on defender positioning"], ans: "A" },
    { q: "What is a 'gut punch' moment defensively in a close game?", opts: ["A physical play inside the paint designed to intimidate an offensive player from driving late in the game", "A technical foul assessed when a defender verbally confronts a scorer directly after a made basket", "A defensive stop followed by a quick scoring possession that swings momentum and psychologically deflates the opponent", "A charge drawn by the trailing defender who sacrifices their body in front of a driving player in the final minute"], ans: "C" },
    { q: "What is 'hunting a mismatch'?", opts: ["Scouting the opponent's defensive lineup for physical weaknesses in footwork, lateral movement, or height", "Calling a specific play the moment a substitution creates a numerical advantage near the rim", "Using screens repeatedly to tire out a defender then attacking them in isolation once fatigue shows", "Deliberately running actions to put a smaller or slower defender on a bigger or more skilled offensive player, then attacking that matchup repeatedly"], ans: "D" },
    { q: "What does 'load management' mean in professional basketball?", opts: ["Distributing ball screens evenly among all five players to prevent any single screener from drawing too many fouls", "Strategically resting players during regular season games to preserve their health and peak performance for the playoffs", "Managing a player's shot volume to prevent overuse injury to their shooting arm during back-to-back stretches", "A coaching philosophy that distributes playing time equally to prevent any player from taking on too many responsibilities"], ans: "B" },
    { q: "What is 'paint protection' as a defensive priority?", opts: ["Prioritizing interior defense by positioning help defenders to contest and deter shots near the basket rather than chasing perimeter shooters", "A foul-limiting strategy instructing bigs to avoid jumping on shot fakes to prevent free throw opportunities near the rim", "A rule preventing players from staying in the paint more than three seconds on defense in youth basketball", "Stationing the team's best shot blocker directly under the basket regardless of defensive scheme or alignment"], ans: "A" },
    { q: "What does 'reading the roll man' mean in pick-and-roll offense?", opts: ["Calculating which direction the roll man will cut based on their dominant foot and body angle at the screen", "Deciding before the screen whether to roll to the rim or pop based on the game situation", "The ball handler identifying whether the roll man's defender is hedging, dropping, or switching, then making the pass decision accordingly", "The roll man signaling with a hand gesture which side of the lane they plan to roll to so the ball handler can time the pass"], ans: "C" },
    { q: "What is 'zone overload' in offensive strategy?", opts: ["Sending all five offensive players into the paint to overwhelm the zone with inside-out pressure each possession", "Running an unscripted fast break into a zone because the zone cannot respond as quickly as man-to-man in transition", "Calling a timeout to install new zone-beating actions the defense hasn't prepared for", "Flooding one side of the zone with three or more offensive players to force those defenders to choose between covering players, creating an open shot on the kick-out"], ans: "D" },
    { q: "What is proper 'body position' in post defense?", opts: ["Using your body to stay between the post player and the basket while keeping a hand in the passing lane to contest entry and recover quickly if the pass arrives", "Pushing the post player as far under the basket as possible to prevent them from catching and turning to face the basket", "Establishing post position on offense rather than defense — using your hips to keep the defender on your back for a cleaner reception", "Keeping both arms completely stationary to prevent a reach-in foul while the post player catches and turns"], ans: "A" },
    { q: "What is 'tagging the roller' in pick-and-roll defense?", opts: ["When the drop defender physically touches the screener after the screen to confirm their assignment before the roll begins", "Assigning a verbal tag to each roller based on jersey number so switches are communicated in real time", "A weak-side help defender stepping in briefly to deter the roller from catching in the paint before recovering to their assignment", "A referee placing a marker on the ball handler to confirm they traveled over the screen line before the possession ends"], ans: "C" },
    { q: "What is the difference between a 'push pass' and a 'flip pass' in tight spaces near the basket?", opts: ["A push pass goes to the near-side receiver; a flip pass curves around the defender by applying inside spin", "A push pass is a firm direct delivery from a stationary position; a flip pass is a quick one-handed lob or flick used in tight spaces when a direct push pass can't reach the target", "Push passes are legal in youth basketball while flip passes require advanced skill not appropriate for younger players", "A push pass travels forward toward a moving target; a flip pass reverses the ball back to the passer's original position"], ans: "B" },
    { q: "What is 'early help' in defense and why can it backfire?", opts: ["A help defender stepping in before a drive begins — preventing penetration but potentially leaving their assignment open for a skip pass if the ball handler pulls back", "Help rotations that arrive before the ball handler commits, causing confusion about who covers the perimeter player", "When the point of attack defender steps in to help a teammate before their own assignment receives the ball", "When a help defender commits too early to stopping a drive, removing themselves from position before the ball handler attacks — leaving their assignment wide open for a skip pass or cut"], ans: "D" },
    { q: "What is 'pace' in advanced basketball analytics?", opts: ["The estimated number of possessions a team uses per 48 minutes, used to normalize statistics for fair cross-team comparison", "How many seconds per possession the offense holds the ball before shooting or turning it over on average", "The distance in feet a team's players travel per game on offense relative to league average", "The ratio of fast break points to half-court scoring that characterizes whether a team plays up-tempo or deliberately"], ans: "A" },
    { q: "What is a 'weak side split cut'?", opts: ["A backdoor cut from the weak side wing directly toward the basket off a skip pass from the point guard", "A two-player sequence where a weak side player dives to the block then immediately pops back to the three-point line", "Two players on the weak side cutting off the post player on opposite sides — one over the top and one backdoor — using the post as a screener to force the defender to choose who to help on", "A cut from the weak side corner up to the elbow that triggers a simultaneous backdoor cut from the other weak side player"], ans: "C" },
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
    customFetch<DailyStatus>(`/api/iso-ball/daily-status`)
      .then((data) => {
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
        const data = await customFetch<SessionResponse>(`/api/iso-ball/sessions`, {
          method: "POST",
          body: JSON.stringify({ difficulty, correctQuestionIndices: correctIndices }),
        });

        // Always invalidate cache — safe to call even if component has unmounted
        qc.invalidateQueries({ queryKey: ["/api/iso-ball/leaderboard"] });
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
                return (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  >
                    <span className={`text-sm font-black w-6 text-center tabular-nums ${entry.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {entry.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate text-foreground">
                          {entry.displayName}
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

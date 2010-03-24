#!/usr/bin/perl -T
use strict;
use warnings;
use CGI;
use CGI::Carp qw/fatalsToBrowser/;
use Digest::MD5;

my $VOTE_TOOL = "/home/voter/bin/vote";
my $VOTE_TMPDIR = "/home/voter/tmp";
my $VOTE_ISSUEDIR = "/home/voter/issues";

$ENV{PATH_INFO} =~ m!^/([\w]+)-(\d+-\w+)/([0-9a-f]{32})/(yna|stv[1-9]|select[1-9])$!
    or die "Invalid URL";
my ($group, $issue, $hash, $type) = ($1, $2, $3, $4);

my $voter = fetch_voter($group, $issue, $hash) or die "Invalid URL";

if ($ENV{REQUEST_METHOD} eq "GET" or $ENV{REQUEST_METHOD} eq "HEAD") {

    my $issue_path = "$VOTE_ISSUEDIR/$group/$issue/issue";
    open my $fh, $issue_path or die "Can't open issue: $!";
    read $fh, my $issue_content, -s $fh;
    close $fh;

    print "Content-Type: text/html\n\n";

    if ($type eq "yna") {
        print yna_form($voter, $issue_content);
    }
    elsif ($type =~ /^stv([1-9])$/) {
        print stv_form($1, $voter, $issue_content);
    }
    elsif ($type =~ /^select([1-9])$/) {
        print select_form($1, $voter, $issue_content);
    }

    exit;

} elsif ($ENV{REQUEST_METHOD} eq "POST") {
    my $q = CGI->new;
    my $vote = $q->param("vote");
    die "Vote undefined" unless defined $vote;

    local %ENV;

    my $tmpfile = "$VOTE_TMPDIR/$issue.$$";
    my $cmd = "$VOTE_TOOL > $tmpfile 2>&1";
    open my $voter_tool, "| $cmd"
        or die "Can't popen '$cmd': $!";

    local $SIG{TERM} = local $SIG{INT} = local $SIG{HUP} = sub {
        unlink $tmpfile;
        die "SIG$_[0] caught";
    };

    print $voter_tool "$issue\n";
    print $voter_tool "$hash\n";
    print $voter_tool "$vote\n";

    close $voter_tool;
    my $vote_status = $?;
    my $vote_log;

    if (open my $fh, $tmpfile) {
        read $fh, $vote_log, -s $fh;
        close $fh;
        unlink $tmpfile;
    }
    else {
        unlink $tmpfile;
        die "Couldn't open $tmpfile: vote status=$vote_status: $!";
    }

    print <<EoVOTE;
Content-Type: text/html

<html>
<head>
<title></title>
</head>
<body>
<h1>Vote results for &lt;$voter&gt; on $group-$issue...</h1>
<h2>Vote Tool Exit Status: $vote_status (0 means success!)</h2>
<textarea>$vote_log</textarea>
</body>

EoVOTE

    exit;

} else {
    die "Unsupported method $ENV{REQUEST_METHOD}";
}

sub fetch_voter {
    my ($group, $issue, $hash) = @_;
    my $issue_id = eval { filestuff("$VOTE_ISSUEDIR/$group/$issue/issue")} or return;
    for my $voter (eval { get_group("$VOTE_ISSUEDIR/$group/voters") }) {
        return $voter if get_hash_of("$issue_id:$voter") eq $hash;
    }
}

sub get_hash_of {
    my ($item) = @_;
    my $md5 = Digest::MD5->new;
    $md5->add($item);
    return $md5->hexdigest;
}


sub get_group {
    my ($groupfile) = @_;
    local $_;
    my @rv;

    open(my $INFILE, $groupfile) || die "cannot open $groupfile: $!";
    while (<$INFILE>) {
        chomp;
        s/#.*$//;
        s/\s+$//;
        s/^\s+//;
        next if (/^$/);
        push(@rv, $_);
    }
    close($INFILE);
    return @rv;
}

sub filestuff {
    my ($filename) = @_;
    my ($dev,$ino,$mode,$nlink,$uid,$gid,$rdev,$size,
        $atime,$mtime,$ctime,$blksize,$blocks);

    ($dev,$ino,$mode,$nlink,$uid,$gid,$rdev,$size,
     $atime,$mtime,$ctime,$blksize,$blocks) = stat($filename)
         or die "Can't stat $filename: $!";

    return "$ino:$mtime";
}

sub yna_form {
    my ($voter, $issue_content) = @_;


my $html = <<EoYNA;

<h1>Cast your vote &lt;$voter&gt;.</h1>
<pre>
$issue_content
</pre>
EoYNA
}

sub stv_form {
    my ($num, $voter, $issue_content) = @_;

    my $html = <<EoSTV;

<h1>Cast your vote &lt;$voter&gt;.</h1>
<pre>
$issue_content
</pre>
EoSTV
}

sub select_form {
    my ($num, $voter, $issue_content) = @_;

    my $html =  <<EoSELECT;

<h1>Cast your vote &lt;$voter&gt;.</h1>
<pre>
$issue_content
</pre>
EoSELECT
}
